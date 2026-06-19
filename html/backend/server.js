require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const bcrypt = require('bcrypt'); 

const app = express();
app.use(express.json());
app.use(cors());

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

// 2. Registration API Endpoint
app.post('/api/register', async (req, res) => {
    const { firstname, middlename, lastname, username, email, password } = req.body;
    
    try {
        if (!password) {
            return res.status(400).json({ success: false, message: "Password is required." });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input('firstname', sql.VarChar(50), firstname)
            .input('middlename', sql.VarChar(50), middlename || null)
            .input('lastname', sql.VarChar(50), lastname)
            .input('username', sql.VarChar(50), username)
            .input('email', sql.VarChar(50), email)
            .input('password', sql.VarChar(255), hashedPassword) 
            .input('role', sql.VarChar(15), 'student') 
            .query(`
                INSERT INTO Appusers (firstname, middlename, lastname, username, email, password, role)
                VALUES (@firstname, @middlename, @lastname, @username, @email, @password, @role)
            `);

        res.status(201).json({ success: true, message: "User registered safely and securely!" });
    } catch (err) {
        console.error("Insert error:", err.message);
        res.status(500).json({ success: false, message: "Database insertion failed." });
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
            .query('SELECT * FROM Appusers WHERE email = @email');

        // FIXED: Extracting the user row directly from the array index
        const user = result.recordset[0];

        // If the user profile isn't found in the database shell
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        // Compare plain-text client input against the database secure hash
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        // Authentication passed! Send profile verification payload to client state
        res.status(200).json({
            success: true,
            message: "Login successful!",
            user: {
                userid: user.userid,
                firstname: user.firstname,
                lastname: user.lastname,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        console.error("Login error:", err.message);
        res.status(500).json({ success: false, message: "An error occurred during authentication." });
    }
});

app.post('/api/addnotes', async (req, res) => {
    const { title, content } = req.body;

    try {
        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input('title', sql.VarChar(100), title)
            .input('content', sql.Text, content)
            .query(`
                INSERT INTO Notes (title, content)
                VALUES (@title, @content)
            `);

// 4. Start the Server and Keep it Alive
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