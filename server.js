import express, { json } from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

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

// example endpoint
app.post('/test', async (req, res) => {
    const { word, size } = req.body;
    await pool.query('INSERT INTO words (word, size) VALUES ($1, $2)', [word, size]);
    res.sendStatus(201);
});

app.listen(3000, () => console.log('Server runs on port 3000'));