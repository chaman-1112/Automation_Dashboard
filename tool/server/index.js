import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dataRouter from './routes/data.js';
import replicateRouter from './routes/replicate.js';
import pool, { dbConnected } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.API_PORT || 4001;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

// --- API Routes ---
app.use('/api/data', dataRouter);
app.use('/api/replicate', replicateRouter);

// --- Health check ---
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'ok', db: 'connected', time: result.rows[0].now });
    } catch (err) {
        res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
    }
});

app.get('/api/whoami', (req, res) => {
    const email = process.env.STAGE_SUPERADMIN_EMAIL || 'unknown';
    const name = email.split('@')[0].replace(/\+/g, ' ');
    res.json({ email, name });
});

app.listen(PORT, () => {
    console.log(`\n  Replication Tool API running at http://localhost:${PORT}`);
    console.log(`  Health check: http://localhost:${PORT}/api/health\n`);
});
