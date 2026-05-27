require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const bcrypt = require('bcrypt'); // 1. Imported the bcrypt hashing library

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

// 2. The API Endpoint to accept secure sign-ups
app.post('/api/register', async (req, res) => {
    const { firstname, middlename, lastname, username, email, password } = req.body;
    
    try {
        // Validation check to make sure password exists before hashing
        if (!password) {
            return res.status(400).json({ success: false, message: "Password is required." });
        }

        // 2. HASH THE PASSWORD SECURELY
        // 10 salt rounds provides excellent protection against brute-force attacks
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input('firstname', sql.VarChar(50), firstname)
            .input('middlename', sql.VarChar(50), middlename || null)
            .input('lastname', sql.VarChar(50), lastname)
            .input('username', sql.VarChar(50), username)
            .input('email', sql.VarChar(50), email)
            .input('password', sql.VarChar(255), hashedPassword) // 3. Passed the secure hash here!
            .input('role', sql.VarChar(15), 'student') // Default role assignment
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

// 3. Start the Server and Keep it Alive
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