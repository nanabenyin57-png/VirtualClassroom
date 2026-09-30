const jwt = require('jsonwebtoken');
require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const bcrypt = require('bcrypt'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static images so frontend can view uploaded photos via HTTP URL
app.use('/uploads', cors(), express.static(path.join(__dirname, 'uploads')));

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer File Upload Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'profile-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// 1. Database Configuration
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, 
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false,               
        trustServerCertificate: true 
    }
};

// JWT Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: "Access denied. No token provided." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: "Invalid or expired token." });
        }
        req.user = user;
        next();
    });
};

// Profile Picture Upload
app.post('/api/upload-profile-image', authenticateToken, upload.single('profileimg'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file uploaded.' });
        }

        // Store a relative path so the database stays portable across hosts/domains
        const imageUrl = `/uploads/${req.file.filename}`;
        const userId = req.user.userid;

        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input('profileimg', sql.VarChar(500), imageUrl)
            .input('userid', sql.Int, userId)
            .query(`
                UPDATE AppUsers
                SET profileimg = @profileimg
                WHERE user_id = @userid
            `);

        return res.status(200).json({
            success: true,
            message: "Profile image updated successfully!",
            imageUrl: imageUrl
        });

    } catch (err) {
        console.error("Profile upload error:", err.message);
        return res.status(500).json({ success: false, message: "Failed to save profile picture." });
    }
});

// 2. Registration API Endpoint
app.post('/api/register', async (req, res) => {
    const { firstname, middlename, lastname, username, email, password, role, classname } = req.body;

    if (!password) {
        return res.status(400).json({ success: false, message: "Password is required." });
    }

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        let pool = await sql.connect(dbConfig);
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();

            const userResult = await transaction.request()
                .input('firstname', sql.VarChar(50), firstname)
                .input('middlename', sql.VarChar(50), middlename || null)
                .input('lastname', sql.VarChar(50), lastname)
                .input('username', sql.VarChar(50), username)
                .input('email', sql.VarChar(255), email)
                .input('password', sql.VarChar(255), hashedPassword)
                .input('role', sql.VarChar(15), role)
                .query(`
                    INSERT INTO AppUsers (firstname, middlename, lastname, username, email, password, role)
                    OUTPUT INSERTED.user_id
                    VALUES (@firstname, @middlename, @lastname, @username, @email, @password, @role);
                `);

            const newUserId = userResult.recordset[0]?.user_id;

            if (!newUserId) {
                await transaction.rollback();
                return res.status(500).json({ success: false, message: "Could not retrieve user ID." });
            }

            if (role && role.trim().toLowerCase() === 'student') {
                if (!classname || classname === 'select_class') {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: "Please select a valid class." });
                }

                await transaction.request()
                    .input('firstname', sql.VarChar(30), firstname)
                    .input('middlename', sql.VarChar(30), middlename || null)
                    .input('lastname', sql.VarChar(30), lastname)
                    .input('email', sql.VarChar(255), email)
                    .input('password', sql.VarChar(256), hashedPassword)
                    .input('classname', sql.Char(4), classname)
                    .input('userid', sql.Int, newUserId)
                    .query(`
                        INSERT INTO students (firstname, middlename, lastname, email, password, classname, userid)
                        VALUES (@firstname, @middlename, @lastname, @email, @password, @classname, @userid);
                    `);
            }

            await transaction.commit();
            return res.status(201).json({ success: true, message: "User registered safely and securely!" });

        } catch (err) {
            await transaction.rollback();
            console.error("Transaction Error:", err.message);
            return res.status(500).json({ success: false, message: "Database error: " + err.message });
        }

    } catch (err) {
        console.error("Server/Hash Error:", err.message);
        return res.status(500).json({ success: false, message: "Internal server processing error." });
    }
});

// 3. Authenticated Login API Endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        let pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('email', sql.VarChar(50), email)
            .query('SELECT * FROM AppUsers WHERE email = @email');

        const user = result.recordset[0];

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        res.status(200).json({
            success: true,
            message: "Login successful!",
            user: {
                userid: user.user_id,
                firstname: user.firstname,
                lastname: user.lastname,
                username: user.username,
                email: user.email,
                role: user.role,
                profileimg: user.profileimg || null
            },
            token: jwt.sign({ userid: user.user_id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' })
        });

    } catch (err) {
        console.error("Login error:", err.message);
        res.status(500).json({ success: false, message: "An error occurred during authentication." });
    }
});

// ==========================================
// ADMIN NOTES API
// ==========================================

// Add a standalone note (the admin dashboard's "ADD NOTES" form posts here).
// Notes here are general: they are not tied to a subject, topic or class.
app.post('/api/addnotes', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ success: false, message: "Title and content are required." });
        }

        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('title', sql.VarChar(150), title)
            .input('content', sql.Text, content)
            .query(`
                INSERT INTO ClassNotes (subjectname, classname, title, content)
                VALUES ('General', 'all', @title, @content)
            `);

        return res.status(200).json({ success: true, message: "Note added successfully." });
    } catch (err) {
        console.error("Error adding admin note:", err.message);
        return res.status(500).json({ success: false, message: "Server error while adding note." });
    }
});

// Course preview endpoint
app.get('/api/course_preview', async (req, res) => {
    const { subjectname } = req.query;
    try {
        if (!subjectname) {
            return res.status(400).json({ success: false, message: "Subject name is required." });
        }

        let pool = await sql.connect(dbConfig);
        const dataheading = await pool.request()
            .input('subjectname', sql.VarChar(50), subjectname)
            .query('SELECT heading, preview, topics FROM course_preview WHERE subjectname=@subjectname');
            
        res.json(dataheading.recordset);
    } catch(err) {
        console.error("Error fetching course preview:", err.message);
        res.status(500).json({ success: false, message: "Failed to fetch course preview from the database." });
    }
});

// Get Topics Endpoint
app.post('/api/get-topics', authenticateToken, async (req, res) => {
    const { subjectname } = req.body;
    try {
        if (!subjectname) {
            return res.status(400).json({ success: false, message: "Subject name is required." });
        }

        let pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('subjectname', sql.VarChar(50), subjectname)
            .query('SELECT topics FROM course_preview WHERE subjectname = @subjectname');

        if (result.recordset.length === 0 || !result.recordset[0].topics) {
            return res.status(404).json({ success: false, message: "No topics found for this subject." });
        }

        res.status(200).json({
            success: true,
            topics: result.recordset[0].topics
        });
    } catch (err) {
        console.error("Error fetching topics:", err.message);
        res.status(500).json({ success: false, message: "Server error while fetching topics." });
    }
});

// Classlist endpoint
app.post('/api/classlist', authenticateToken, async (req, res) => {
    const { classname } = req.body;

    if (!classname) {
        return res.status(400).json({ 
            success: false, 
            message: "Class name parameter is required." 
        });
    }

    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('classname', sql.Char(4), classname)
            .query(`
                SELECT studid, firstname, middlename, lastname, email
                FROM students
                WHERE classname = @classname
                ORDER BY lastname ASC, firstname ASC;
            `);

        return res.status(200).json({
            success: true,
            count: result.recordset.length,
            students: result.recordset
        });

    } catch (err) {
        console.error("Database query error:", err.message);
        return res.status(500).json({ 
            success: false, 
            message: "Database retrieval error: " + err.message 
        });
    }
});

// Give Assignment API Endpoint
app.post('/api/add-assignment', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        const { subjectname, classname, title, content } = req.body;

        if (!subjectname || !classname || !content) {
            return res.status(400).json({ success: false, message: "Subject, Class, and Content are required fields." });
        }

        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('subjectname', sql.VarChar, subjectname)
            .input('classname', sql.VarChar, classname)
            .input('title', sql.VarChar, title || 'Assignment')
            .input('content', sql.Text, content)
            .query(`
                INSERT INTO Assignments (subjectname, classname, title, content)
                VALUES (@subjectname, @classname, @title, @content)
            `);

        res.status(200).json({ success: true, message: "Assignment successfully posted to the class!" });
    } catch (err) {
        console.error("Error adding assignment:", err.message);
        res.status(500).json({ success: false, message: "Server error while posting assignment." });
    }
});

// Add Class Notes API Endpoint
app.post('/api/add-note', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        const { subjectname, topicname, classname, title, content } = req.body;

        if (!subjectname || !topicname || !classname || !title || !content) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('subjectname', sql.VarChar, subjectname)
            .input('topicname', sql.VarChar, topicname)
            .input('classname', sql.VarChar, classname)
            .input('title', sql.VarChar, title)
            .input('content', sql.Text, content)
            .query(`
                INSERT INTO ClassNotes (subjectname, topicname, classname, title, content)
                VALUES (@subjectname, @topicname, @classname, @title, @content)
            `);

        res.status(200).json({ success: true, message: "Note successfully added and linked to the topic!" });
    } catch (err) {
        console.error("Error adding note:", err.message);
        res.status(500).json({ success: false, message: "Server error while adding note." });
    }
});

// ==========================================
// STUDENT DASHBOARD BACKEND API ENDPOINTS
// ==========================================

app.get('/api/assignments', authenticateToken, async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let queryStr = 'SELECT assignment_id AS id, subjectname, classname, title, content FROM Assignments';
        let request = pool.request();

        if (req.user.role === 'student') {
            const studentResult = await pool.request()
                .input('userid', sql.Int, req.user.userid)
                .query('SELECT classname FROM students WHERE userid = @userid');
            if (studentResult.recordset.length > 0) {
                const studentClass = studentResult.recordset[0].classname;
                queryStr += ' WHERE classname = @classname';
                request.input('classname', sql.Char(4), studentClass);
            }
        }
        queryStr += ' ORDER BY assignment_id DESC';
        const result = await request.query(queryStr);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("Error fetching assignments:", err.message);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

app.post('/api/submit-assignment', authenticateToken, async (req, res) => {
    try {
        const { assignment_id, content } = req.body;
        const student_id = req.user.userid;

        if (!assignment_id || !content) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('assignment_id', sql.Int, assignment_id)
            .input('student_id', sql.Int, student_id)
            .input('content', sql.Text, content)
            .query(`
                INSERT INTO AssignmentSubmissions (assignment_id, student_id, content)
                VALUES (@assignment_id, @student_id, @content)
            `);

        res.status(200).json({ success: true, message: "Assignment submitted successfully." });
    } catch (err) {
        console.error("Error saving assignment submission:", err.message);
        res.status(500).json({ success: false, message: "Server error during submission." });
    }
});

app.get('/api/notes', authenticateToken, async (req, res) => {
    try {
        const { subjectname } = req.query;
        if (!subjectname) {
            return res.status(400).json({ success: false, message: "Subject name is required." });
        }

        let pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('subjectname', sql.VarChar(50), subjectname)
            .query('SELECT note_id AS id, subjectname, topicname, classname, title, content FROM ClassNotes WHERE subjectname = @subjectname ORDER BY note_id DESC');

        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("Error fetching class notes:", err.message);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

app.post('/api/ask-question', authenticateToken, async (req, res) => {
    try {
        const { subjectname, title, content } = req.body;
        const student_id = req.user.userid;

        if (!subjectname || !title || !content) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input('student_id', sql.Int, student_id)
            .input('subjectname', sql.VarChar(50), subjectname)
            .input('title', sql.VarChar(200), title)
            .input('content', sql.Text, content)
            .query(`
                INSERT INTO StudentQuestions (student_id, subjectname, title, content, created_at)
                VALUES (@student_id, @subjectname, @title, @content, GETDATE())
            `);

        res.status(200).json({ success: true, message: "Question sent to teacher successfully." });
    } catch (err) {
        console.error("Error saving question:", err.message);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

app.get('/api/teacher/submissions', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        let pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT 
                sub.submission_id,
                sub.assignment_id,
                sub.content AS submission_content,
                sub.submitted_at,
                a.title AS assignment_title,
                a.subjectname,
                a.classname,
                u.firstname,
                u.lastname,
                u.email
            FROM AssignmentSubmissions sub
            JOIN Assignments a ON sub.assignment_id = a.id
            JOIN AppUsers u ON sub.student_id = u.user_id
            ORDER BY sub.submitted_at DESC
        `);

        res.status(200).json({ success: true, submissions: result.recordset });
    } catch (err) {
        console.error("Error fetching teacher submissions:", err.message);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

app.get('/api/teacher/questions', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        let pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT 
                q.question_id,
                q.subjectname,
                q.title,
                q.content,
                q.created_at,
                u.firstname,
                u.lastname,
                u.email
            FROM StudentQuestions q
            JOIN AppUsers u ON q.student_id = u.user_id
            ORDER BY q.created_at DESC
        `);

        res.status(200).json({ success: true, questions: result.recordset });
    } catch (err) {
        console.error("Error fetching teacher questions:", err.message);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

app.get('/api/database-search', authenticateToken, async (req, res) => {
    try {
        const { table, query } = req.query;

        if (!query) {
            return res.status(400).json({ success: false, message: "Search query string is required." });
        }

        const allowedTables = {
            'course_preview': { source: 'course_preview', searchCols: ['heading', 'preview', 'subjectname', 'topics'] },
            'assignments': { source: 'Assignments', searchCols: ['title', 'content', 'subjectname', 'classname'] },
            'classnotes': { source: 'ClassNotes', searchCols: ['title', 'content', 'subjectname', 'topicname'] }
        };

        // 'all' is a legitimate value meaning "search every table", so only
        // reject a table name that is neither 'all' nor in the allowlist.
        if (table && table !== 'all' && !allowedTables[table]) {
            return res.status(403).json({ success: false, message: "Unauthorized or invalid table target." });
        }

        let results = [];
        let pool = await sql.connect(dbConfig);
        const searchTerm = `%${query}%`;

        if (table && table !== 'all') {
            if (!allowedTables[table]) {
                return res.status(403).json({ success: false, message: "Unauthorized or invalid table target." });
            }
            const cfg = allowedTables[table];
            const whereClause = cfg.searchCols.map(col => `${col} LIKE @searchTerm`).join(' OR ');
            const sqlQuery = `SELECT *, '${table}' AS source_table FROM ${cfg.source} WHERE ${whereClause}`;
            
            const result = await pool.request()
                .input('searchTerm', sql.VarChar, searchTerm)
                .query(sqlQuery);
            results = result.recordset;
        } else {
            for (const [key, cfg] of Object.entries(allowedTables)) {
                const whereClause = cfg.searchCols.map(col => `${col} LIKE @searchTerm_${key}`).join(' OR ');
                const sqlQuery = `SELECT *, '${key}' AS source_table FROM ${cfg.source} WHERE ${whereClause}`;
                
                const result = await pool.request()
                    .input(`searchTerm_${key}`, sql.VarChar, searchTerm)
                    .query(sqlQuery);
                results = results.concat(result.recordset);
            }
        }

        res.status(200).json({ success: true, results });
    } catch (err) {
        console.error("Database search error:", err.message);
        res.status(500).json({ success: false, message: "Error executing database search." });
    }
});

// ==========================================
// GEMINI AI ASSISTANT SERVICE & ENDPOINT
// ==========================================

const ai = new GoogleGenAI(); // Picks up GEMINI_API_KEY from process.env automatically

async function queryDatabase({ queryText }) {
    try {
        let pool = await sql.connect(dbConfig); // Fixed: Added dbConfig connection
        const result = await pool.request()
            .input('search', sql.VarChar, `%${queryText}%`)
            .query(`
                SELECT TOP 5 title, content, subjectname 
                FROM Assignments 
                WHERE title LIKE @search OR content LIKE @search
                UNION
                SELECT TOP 5 title, content, subjectname 
                FROM ClassNotes 
                WHERE title LIKE @search OR content LIKE @search
            `);
        return JSON.stringify(result.recordset);
    } catch (err) {
        return JSON.stringify({ error: "Database search failed: " + err.message });
    }
}

const databaseTool = {
    declaration: {
        name: "queryDatabase",
        description: "Searches internal VirtualClassroom database tables (assignments and class notes) for relevant educational context.",
        parameters: {
            type: "OBJECT",
            properties: {
                queryText: {
                    type: "STRING",
                    description: "The keyword or topic to search for in assignments and notes."
                }
            },
            required: ["queryText"]
        }
    },
    implementation: queryDatabase
};
async function handleAIAssistantRequest(prompt, userRole) {
    try {
        const systemInstruction = `
            You are an intelligent teaching and learning assistant inside the VirtualClassroom platform. 
            Your role depends on who is asking:
            - If the user is a STUDENT: Help answer their academic questions clearly, referencing course content or internal database records when necessary.
            - If the user is a TEACHER: Assist them in drafting lesson notes, creating curriculum outlines, and structuring assignments.
            You have access to Google Search built into your model settings to fetch real-world external knowledge, and a custom database tool to look up internal school files.
        `;

        // Initial call to Gemini using gemini-2.5-flash
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                tools: [{ googleSearch: {} }, databaseTool.declaration],
                temperature: 0.7,
            }
        });

        // Check if the model triggered a tool call (like querying the database)
        const functionCalls = response.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
            // Answer every function call the model made, not just the first.
            // Gemini expects one functionResponse part per functionCall; skipping
            // any of them leaves the follow-up turn malformed.
            const responseParts = await Promise.all(functionCalls.map(async (call) => {
                let result;
                try {
                    result = call.name === 'queryDatabase'
                        ? await databaseTool.implementation(call.args)
                        : JSON.stringify({ error: `Unknown tool: ${call.name}` });
                } catch (toolErr) {
                    result = JSON.stringify({ error: toolErr.message });
                }
                return { functionResponse: { name: call.name, response: { result } } };
            }));

            const followUpResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    { role: 'user', parts: [{ text: prompt }] },
                    // Replay the model's own turn verbatim. Rebuilding it as
                    // { functionCall: call } drops the thoughtSignature that
                    // Gemini thinking models require on the function-call part,
                    // which makes the API reject the follow-up with a 400.
                    response.candidates[0].content,
                    { role: 'user', parts: responseParts }
                ],
                config: { systemInstruction: systemInstruction }
            });
            return { success: true, answer: followUpResponse.text };
        }

        return { success: true, answer: response.text };

    } catch (error) {
        console.error("AI Assistant Error Details:", error);
        if (error.status === 429) {
            return { success: false, message: "AI Assistant is currently experiencing high traffic or quota limits. Please wait a moment and try again." };
        }
        return { success: false, message: "Failed to generate AI response: " + error.message };
    }
}

// AI Assistant Route linked for frontend access
app.post('/api/ai-assistant', authenticateToken, async (req, res) => {
    const { prompt } = req.body;
    const userRole = req.user.role; 

    if (!prompt) {
        return res.status(400).json({ success: false, message: "Prompt is required." });
    }

    const aiResult = await handleAIAssistantRequest(prompt, userRole);
    if (aiResult.success) {
        return res.status(200).json({ success: true, answer: aiResult.answer });
    } else {
        return res.status(500).json({ success: false, message: aiResult.message });
    }
});

// 6. Start Server
const PORT = process.env.PORT || 5000;
async function startServer() {
    try {
        console.log("🔄 Connecting to MS SQL Server inside Docker...");
        await sql.connect(dbConfig);
        console.log("🚀 Connected to MS SQL Server inside Docker successfully!");
        
        app.listen(PORT, () => {
            console.log(`📡 Backend API active at http://127.0.0.1:${PORT}`);
            console.log("Control + C to stop the server anytime.");
        });
    } catch (err) {
        console.error("❌ Critical Database connection failed on startup!");
        console.error(err.message);
        process.exit(1); 
    }
}

startServer();