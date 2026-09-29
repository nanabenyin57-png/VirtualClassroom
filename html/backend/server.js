const jwt = require('jsonwebtoken');
require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const bcrypt = require('bcrypt'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

        const imageUrl = `http://127.0.0.1:${process.env.PORT || 5000}/uploads/${req.file.filename}`;
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

// Get Topics Endpoint (Required for dynamic topic dropdown population)
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
        console.error("Error adding assignment:", err);
        res.status(500).json({ success: false, message: "Server error while posting assignment." });
    }
});

// Unified Add Class Notes API Endpoint (Linked to Subject, Topic, and Class)
app.post('/api/add-note', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        const { subjectname, topicname, classname, title, content } = req.body;

        if (!subjectname || !topicname || !classname || !title || !content) {
            return res.status(400).json({ success: false, message: "All fields (Subject, Topic, Class, Title, and Content) are required." });
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
        console.error("Error adding note:", err);
        res.status(500).json({ success: false, message: "Server error while adding note." });
    }
});


// 5. Start Server

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