import express, { json } from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

dotenv.config();
const app = express();


app.use(json());
app.use(cors());
const pool = new Pool({ 
    user: 'postgres', // Default username is usually 'postgres' or your macOS
    host: 'localhost',
    database: 'postgres', // Make sure to create this database in Postgres
    password: process.env.VITE_POSTGRE_PASSWORD, // Enter your postgres password here
    port: 5432,
});
pool.connect()
.then(() => console.log('Connected to PostgreSQL successfully!'))
.catch(err => console.error('Connection error', err.stack));

// Helper function to verify JWT
const verifyToken = (req) => {
    const tokenHeaderKey = process.env.TOKEN_HEADER_KEY || 'authorization';
    const jwtSecretKey = process.env.JWT_SECRET_KEY;
    let token = req.header(tokenHeaderKey) || req.header('authorization');
    if (!token) return null;
    if (token.startsWith('Bearer ')) {
        token = token.substring(7);
    }
    try {
        return jwt.verify(token, jwtSecretKey);
    } catch (error) {
        return null;
    }
};

// example endpoint
app.post('/test', async (req, res) => {
    const { word, size } = req.body;
    await pool.query('INSERT INTO words (word, size) VALUES ($1, $2)', [word, size]);
    res.sendStatus(201);
});

app.post("/words/add", async (req, res) => {
    const verified = verifyToken(req);
    if (!verified || !verified.admin) {
        return res.status(403).send('Admin privileges required');
    }
    const { word } = req.body;
    if (!word || word.trim() === '') {
        return res.status(400).send('Word is required');
    }
    const size = word.length;
    try {
        // Check if word exists
        const existing = await pool.query('SELECT id FROM words WHERE word = $1', [word.toLowerCase()]);
        if (existing.rows.length > 0) {
            return res.status(400).send('Word already exists');
        }
        await pool.query('INSERT INTO words (word, size) VALUES ($1, $2)', [word.toLowerCase(), size]);
        res.status(201).send('Word added successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding word');
    }
});

app.get("/words/getall", async (req, res) => {
    const verified = verifyToken(req);
    if (!verified || !verified.admin) {
        return res.status(403).send('Admin privileges required');
    }
    try {
        const result = await pool.query('SELECT * FROM words ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving words');
    }
});

app.delete("/words/delete/:id", async (req, res) => {
    const verified = verifyToken(req);
    if (!verified || !verified.admin) {
        return res.status(403).send('Admin privileges required');
    }
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM words WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).send('Word not found');
        }
        res.send('Word deleted successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting word');
    }
});

app.get("/words/getrandom", async (req, res) => {
    try {
        const result = await pool.query('SELECT word FROM words ORDER BY RANDOM() LIMIT 1');
        if (result.rows.length === 0) {
            return res.status(404).send('No words available');
        }
        res.json({ word: result.rows[0].word });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving random word');
    }
});

app.post("/user/create", async (req, res) => {
    const verified = verifyToken(req);
    if (verified) {
        return res.status(400).send('User is already logged in');
    }
    const { username, password } = req.body;
    if (!username || !password || username.trim() === '' || password.length < 6) {
        return res.status(400).send('Invalid username or password');
    }
    try {
        // Check if user exists
        const existing = await pool.query('SELECT id FROM "user" WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            return res.status(400).send('Username already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO "user" (username, password) VALUES ($1, $2)', [username, hashedPassword]);
        res.status(201).send('User created successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating user');
    }
});

app.get("/user/exists", async (req, res) => {
    const verified = verifyToken(req);
    if (verified) {
        return res.status(400).send('User is already logged in');
    }
    const { username } = req.query;
    if (!username) {
        return res.status(400).send('Username is required');
    }
    try {
        const result = await pool.query('SELECT id FROM "user" WHERE username = $1', [username]);
        res.json({ exists: result.rows.length > 0 });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error checking user existence');
    }
});

app.get("/user/getusername/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT username FROM "user" WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).send('User not found');
        }
        res.json({ username: result.rows[0].username });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving username');
    }
});

// Generating JWT
app.post("/user/generateToken", async (req, res) => {
    const { username, password, secret } = req.body;
    let userId, admin = false;
    if (username && password) {
        // Normal login
        if (!username || !password) {
            return res.status(400).send('Username and password are required');
        }
        try {
            const result = await pool.query('SELECT id, password FROM "user" WHERE username = $1', [username]);
            if (result.rows.length === 0) {
                return res.status(401).send('Invalid username or password');
            }
            const user = result.rows[0];
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).send('Invalid username or password');
            }
            userId = user.id;
        } catch (error) {
            console.error(error);
            res.status(500).send('Error generating token');
            return;
        }
    } else if (secret) {
        // Promote with secret
        const verified = verifyToken(req);
        if (!verified) {
            return res.status(401).send('Unauthorized');
        }
        userId = verified.userId;
        const adminSecret = process.env.SECRTET_ADMIN_KEY?.trim();
        if (!adminSecret || secret !== adminSecret) {
            return res.status(401).send('Invalid secret');
        }
        admin = true;
    } else {
        return res.status(400).send('Invalid request');
    }
    const jwtSecretKey = process.env.JWT_SECRET_KEY;
    const data = {
        time: Date(),
        userId: userId,
        admin: admin
    };
    const token = jwt.sign(data, jwtSecretKey);
    res.json({ token });
});

app.get("/user/validateToken", (req, res) => {
    const verified = verifyToken(req);
    if (verified) {
        return res.json({ valid: true, userId: verified.userId, admin: verified.admin });
    }
    return res.status(401).json({ valid: false });
});

app.post("/user/update", async (req, res) => {
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { currentPassword, newUsername, newPassword } = req.body;
    if (!currentPassword) {
        return res.status(400).send('Current password is required');
    }
    try {
        const result = await pool.query('SELECT password FROM "user" WHERE id = $1', [verified.userId]);
        if (result.rows.length === 0) {
            return res.status(404).send('User not found');
        }
        const isValid = await bcrypt.compare(currentPassword, result.rows[0].password);
        if (!isValid) {
            return res.status(401).send('Invalid current password');
        }
        if (newUsername) {
            const existing = await pool.query('SELECT id FROM "user" WHERE username = $1 AND id != $2', [newUsername, verified.userId]);
            if (existing.rows.length > 0) {
                return res.status(400).send('Username already exists');
            }
            await pool.query('UPDATE "user" SET username = $1 WHERE id = $2', [newUsername, verified.userId]);
        }
        if (newPassword) {
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            await pool.query('UPDATE "user" SET password = $1 WHERE id = $2', [hashedNewPassword, verified.userId]);
        }
        res.send('User updated successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating user');
    }
});

app.delete("/user/delete", async (req, res) => {
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { password } = req.body;
    if (!password) {
        return res.status(400).send('Password is required');
    }
    try {
        const result = await pool.query('SELECT password FROM "user" WHERE id = $1', [verified.userId]);
        if (result.rows.length === 0) {
            return res.status(404).send('User not found');
        }
        const isValid = await bcrypt.compare(password, result.rows[0].password);
        if (!isValid) {
            return res.status(401).send('Invalid password');
        }
        await pool.query('DELETE FROM "user" WHERE id = $1', [verified.userId]);
        res.send('User deleted successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting user');
    }
});

app.get("/rounds/active", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.id, r.wordsize, u.username as host
            FROM round r
            JOIN "user" u ON r.host = u.id
            WHERE r.active = true
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving active rounds');
    }
});

app.listen(3000, () => console.log('Server runs on port 3000'));