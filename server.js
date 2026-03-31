const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());
const pool = new Pool({ 
    user: 'postgres', // Default username is usually 'postgres' or your macOS
    host: 'localhost',
    database: 'postgres', // Make sure to create this database in Postgres
    password: process.env.POSTGRE_PASSWORD, // Enter your postgres password here
    port: 5432,
});
pool.connect()
.then(() => console.log('Connected to PostgreSQL successfully!'))
.catch(err => console.error('Connection error', err.stack));
// Endpoint dla Ucznia A
app.post('/questions', async (req, res) => {
    const { content, opt_a, opt_b, opt_c, opt_d, correct_answer } = req.body;
    await pool.query('INSERT INTO questions (content, opt_a, opt_b, opt_c, opt_d, correct_answer) VALUES ($1, $2, $3, $4, $5, $6)',[content, opt_a, opt_b, opt_c, opt_d, correct_answer]);
    res.sendStatus(201);
});
// Endpoint dla Ucznia B
app.get('/questions', async (req, res) => {
    const result = await pool.query('SELECT * FROM questions');
    res.json(result.rows);
});
app.listen(3000, () => console.log('Server runs on port 3000'));