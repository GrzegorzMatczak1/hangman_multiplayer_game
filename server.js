import express, { json } from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

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
.then(async () => {
    console.log('Connected to PostgreSQL successfully!');
    // Load words from JSON file if not already loaded
    try {
        const wordCount = await pool.query('SELECT COUNT(*) FROM words');
        if (parseInt(wordCount.rows[0].count) === 0) {
            const wordsPath = path.join(process.cwd(), 'public', 'words.json');
            const wordsData = fs.readFileSync(wordsPath, 'utf8');
            const words = JSON.parse(wordsData);
            for (const item of words) {
                await pool.query('INSERT INTO words (word, size) VALUES ($1, $2)', [item.word, item.word.length]);
            }
            console.log('Words loaded into database');
        }
    } catch (error) {
        console.error('Error loading words:', error);
    }
})
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
    if (username.trim().startsWith('BOT_')) {
        return res.status(400).send('Cannot register bot-reserved usernames');
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

app.post('/bots/create', async (req, res) => {
    const verified = verifyToken(req);
    if (!verified || !verified.admin) {
        return res.status(403).send('Admin privileges required');
    }

    let { count } = req.body;
    count = Number(count) || 10;
    count = Math.max(1, Math.min(50, count));

    const created = [];

    try {
        for (let i = 1; i <= count; i++) {
            const username = `BOT_${String(i).padStart(3, '0')}`;
            const existing = await pool.query('SELECT id FROM "user" WHERE username = $1', [username]);
            if (existing.rows.length > 0) continue;
            const password = crypto.randomBytes(8).toString('hex');
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query('INSERT INTO "user" (username, password) VALUES ($1, $2)', [username, hashedPassword]);
            created.push(username);
        }
        res.json({ created, count: created.length });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating bot users');
    }
});

app.post("/user/resetlives/:id", async (req, res) => {
    // Reset the user's lives to 10 on the user table.
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { id } = req.params;
    try {
        await pool.query('UPDATE "user" SET lives = 10 WHERE id = $1', [id]);
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error resetting lives');
    }
});

app.post("/user/resetguesses/:id", async (req, res) => {
    // Reset the user's guesses array on the user table.
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { id } = req.params;
    try {
        await pool.query('UPDATE "user" SET guesses = ARRAY[]::varchar(50)[] WHERE id = $1', [id]);
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error resetting guesses');
    }
});

app.post("/user/resettime/:id", async (req, res) => {
    // Reset the user's time on the user table.
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { id } = req.params;
    try {
        await pool.query(`UPDATE "user" SET timeteaken = INTERVAL '0 seconds' WHERE id = $1`, [id]);
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error resetting time');
    }
});

app.post("/user/resetfinished/:id", async (req, res) => {
    // Reset the user's finished status on the user table.
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { id } = req.params;
    try {
        await pool.query('UPDATE "user" SET finished = false WHERE id = $1', [id]);
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error resetting finished status');
    }
});

app.post("/user/resetfoundword/:id", async (req, res) => {
    // Reset the user's foundword flag on the user table.
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { id } = req.params;
    try {
        await pool.query('UPDATE "user" SET foundword = false WHERE id = $1', [id]);
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error resetting found word');
    }
});

app.post("/user/resetall/:id", async (req, res) => {
    // Reset all per-user state on the user table.
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { id } = req.params;
    try {
        await pool.query(`
            UPDATE "user"
            SET lives = 10,
                guesses = ARRAY[]::varchar(50)[],
                timeteaken = INTERVAL '0 seconds',
                finished = false,
                foundword = false
            WHERE id = $1
        `, [id]);
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error resetting all user data');
    }
});

app.post("/user/removelive/:id", async (req, res) => {
    // Decrement the user's lives on the user table.
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { id } = req.params;
    try {
        await pool.query('UPDATE "user" SET lives = GREATEST(lives - 1, 0) WHERE id = $1', [id]);
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error removing live');
    }
});

app.post("/user/addguess/:id", async (req, res) => {
    // Add the user's guess to their guesses array.
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { id } = req.params;
    const { guess } = req.body;
    try {
        await pool.query(`
            UPDATE "user"
            SET guesses = CASE
                WHEN $1 = ANY(COALESCE(guesses, ARRAY[]::varchar(50)[])) THEN guesses
                ELSE COALESCE(guesses, ARRAY[]::varchar(50)[]) || ARRAY[$1]
            END
            WHERE id = $2
        `, [guess, id]);
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding guess');
    }
});

app.post("/user/settime/:id", async (req, res) => {
    // Save elapsed seconds as an interval on the user table.
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { id } = req.params;
    const { time } = req.body;
    try {
        await pool.query('UPDATE "user" SET timeteaken = make_interval(secs => $1) WHERE id = $2', [time, id]);
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error setting time');
    }
});

app.post("/user/setfoundword/:id", async (req, res) => {
    // Set the user's foundword flag when they guess the full word correctly.
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { id } = req.params;
    const { foundword } = req.body;
    try {
        await pool.query('UPDATE "user" SET foundword = $1 WHERE id = $2', [foundword, id]);
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error setting found word');
    }
});

app.post("/user/setfinished/:id", async (req, res) => {
    // Set the user's finished flag when their round completes.
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { id } = req.params;
    try {
        await pool.query('UPDATE "user" SET finished = true WHERE id = $1', [id]);
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error setting finished status');
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
        if (username.trim().startsWith('BOT_')) {
            return res.status(401).send('Bot accounts cannot log in.');
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

app.post("/round/create/:id", async (req, res) => {
    // Create a new round with the given id as host
    // randomly select a word from the database and save it to the round, and then calculate its size as wordsize
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { id } = req.params;
    try {
        // Get a random word
        const wordResult = await pool.query('SELECT id, word FROM words ORDER BY RANDOM() LIMIT 1');
        if (wordResult.rows.length === 0) {
            return res.status(500).send('No words available');
        }
        const wordId = wordResult.rows[0].id;
        const word = wordResult.rows[0].word;
        const wordsize = word.length;

        // Create the round
        const roundResult = await pool.query(`
            INSERT INTO round (host, chosenword, wordsize, active, started, finished)
            VALUES ($1, $2, $3, true, false, false)
            RETURNING id
        `, [id, wordId, wordsize]);

        const roundId = roundResult.rows[0].id;

        // Add the host as a player membership record
        await pool.query(`
            INSERT INTO roundinfo (roundid, userid)
            SELECT $1, $2
            WHERE NOT EXISTS (
                SELECT 1 FROM roundinfo WHERE roundid = $1 AND userid = $2
            )
        `, [roundId, id]);

        // Reset the host's round state on user table
        await pool.query(`
            UPDATE "user"
            SET lives = 10,
                guesses = COALESCE(guesses, ARRAY[]::varchar(50)[]),
                timeteaken = INTERVAL '0 seconds',
                finished = false,
                foundword = false
            WHERE id = $1
        `, [id]);

        res.json({ roundId });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating round');
    }
});

app.post("/round/changeactive", async (req, res) => {
    // Change round active status from true to false
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { roundId } = req.body;
    try {
        await pool.query('UPDATE round SET active = false WHERE id = $1', [roundId]);
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error changing round active status');
    }
});

app.post("/round/changestarted", async (req, res) => {
    // Change round started status from false to true
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { roundId } = req.body;
    try {
        await pool.query('UPDATE round SET started = true WHERE id = $1', [roundId]);
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error changing round started status');
    }
});

app.post("/round/changefinished", async (req, res) => {
    // Change round finished status from false to true
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { roundId } = req.body;
    try {
        await pool.query('UPDATE round SET finished = true WHERE id = $1', [roundId]);
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error changing round finished status');
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

app.get("/rounds/inactive", async (req, res) => {
    // Return list of inactive rounds
    try {
        const result = await pool.query(`
            SELECT r.id, r.wordsize, u.username as host
            FROM round r
            JOIN "user" u ON r.host = u.id
            WHERE r.active = false
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving inactive rounds');
    }
});

app.post("/roundinfo/create/:roundId/:userId", async (req, res) => {
    // Create a new round membership entry. The user's round state is stored on the user table.
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { roundId, userId } = req.params;
    try {
        await pool.query(`
            INSERT INTO roundinfo (roundid, userid)
            SELECT $1, $2
            WHERE NOT EXISTS (
                SELECT 1 FROM roundinfo WHERE roundid = $1 AND userid = $2
            )
        `, [roundId, userId]);

        await pool.query(`
            UPDATE "user"
            SET lives = 10,
                guesses = COALESCE(guesses, ARRAY[]::varchar(50)[]),
                timeteaken = INTERVAL '0 seconds',
                finished = false,
                foundword = false
            WHERE id = $1
        `, [userId]);

        res.sendStatus(201);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating roundinfo');
    }
});

app.post("/roundinfo/updatelives/:roundId/:userId", async (req, res) => {
    // This endpoint is used to update the user's lives when they make a wrong guess.
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { userId } = req.params;
    const { lives } = req.body;
    try {
        await pool.query('UPDATE "user" SET lives = $1 WHERE id = $2', [lives, userId]);
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating lives');
    }
});

// Additional endpoints for round management
app.get("/round/:id", async (req, res) => {
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT r.id, r.host, r.wordsize, r.active, r.started, r.finished, 
                   w.word, u.username as host_username
            FROM round r
            JOIN words w ON r.chosenword = w.id
            JOIN "user" u ON r.host = u.id
            WHERE r.id = $1
        `, [id]);
        if (result.rows.length === 0) {
            return res.status(404).send('Round not found');
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving round');
    }
});

app.get("/round/:id/players", async (req, res) => {
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT u.id AS userid,
                   u.username,
                   u.lives,
                   u.guesses,
                   COALESCE(EXTRACT(EPOCH FROM u.timeteaken), 0)::integer AS time,
                   u.finished,
                   u.foundword
            FROM roundinfo ri
            JOIN "user" u ON ri.userid = u.id
            WHERE ri.roundid = $1
        `, [id]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving round players');
    }
});

app.post("/round/cancel", async (req, res) => {
    const verified = verifyToken(req);
    if (!verified) {
        return res.status(401).send('Unauthorized');
    }

    const { roundId } = req.body;

    try {
        // set all users to DNF with 10 lives
        await pool.query(`
            UPDATE "user"
            SET lives = 10,
                finished = true,
                timeteaken = INTERVAL '-1 seconds'
            WHERE id IN (
                SELECT userid FROM roundinfo WHERE roundid = $1
            )
        `, [roundId]);

        await pool.query(`
            UPDATE round 
            SET active = false, finished = true 
            WHERE id = $1
        `, [roundId]);

        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error cancelling round');
    }
});

app.post("/words/loadfromjson", async (req, res) => {
    const verified = verifyToken(req);
    if (!verified || !verified.admin) {
        return res.status(403).send('Admin privileges required');
    }
    const { words } = req.body;
    if (!Array.isArray(words)) {
        return res.status(400).send('Words must be an array');
    }
    try {
        let added = 0;
        let skipped = 0;
        for (const wordObj of words) {
            if (!wordObj.word || typeof wordObj.word !== 'string') continue;
            const word = wordObj.word.toLowerCase().trim();
            if (word === '') continue;
            
            const existing = await pool.query('SELECT id FROM words WHERE word = $1', [word]);
            if (existing.rows.length > 0) {
                skipped++;
                continue;
            }
            
            await pool.query('INSERT INTO words (word, size) VALUES ($1, $2)', [word, word.length]);
            added++;
        }
        res.json({ added, skipped, message: `Added ${added} words, skipped ${skipped} duplicates` });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading words from JSON');
    }
});



app.listen(3000, () => console.log('Server runs on port 3000'));