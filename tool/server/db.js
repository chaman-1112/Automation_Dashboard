import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from the playwright root
dotenv.config({ path: resolve(__dirname, '../../.env') });

const dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 30000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    allowExitOnIdle: false,
};

console.log(`  DB config: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

const pool = new pg.Pool(dbConfig);

// Rate-limit pool error logging to avoid flooding the console
let lastPoolError = 0;
const POOL_ERROR_THROTTLE_MS = 10000; // Only log once every 10 seconds

pool.on('error', (err) => {
    const now = Date.now();
    if (now - lastPoolError > POOL_ERROR_THROTTLE_MS) {
        lastPoolError = now;
        console.error(`  [DB Pool] ${err.code || 'ERROR'}: ${err.message}`);
    }
});

// Track connection status
let dbConnected = false;

// Test connection on startup
(async () => {
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        dbConnected = true;
        console.log(`  DB connected successfully at ${res.rows[0].now}`);
        client.release();
    } catch (err) {
        dbConnected = false;
        console.error(`\n  DB connection FAILED: ${err.message}`);
        console.error(`  Check that:`);
        console.error(`    1. You are connected to VPN (if required)`);
        console.error(`    2. Your IP is whitelisted in the DB security group`);
        console.error(`    3. DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in .env are correct\n`);
    }
})();

export { dbConnected };
export default pool;
