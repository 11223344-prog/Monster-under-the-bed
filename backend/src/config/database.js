const { Pool } = require('pg');
require('dotenv').config();

// Create connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'monster_game_db',
    max: parseInt(process.env.DB_MAX_POOL) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Test connection
async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL database');
        client.release();
        return true;
    } catch (error) {
        console.error('❌ PostgreSQL connection failed:', error.message);
        return false;
    }
}

// Initialize database
async function initializeDatabase() {
    const client = await pool.connect();
    try {
        console.log('🔄 Initializing database tables...');
        
        // Create users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Users table ready');

        // Create game_saves table
        await client.query(`
            CREATE TABLE IF NOT EXISTS game_saves (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                game_state JSONB NOT NULL,
                chapter VARCHAR(100),
                progress INTEGER DEFAULT 0,
                last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Game saves table ready');

        // Create game_settings table
        await client.query(`
            CREATE TABLE IF NOT EXISTS game_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE NOT NULL,
                sound_enabled BOOLEAN DEFAULT TRUE,
                music_enabled BOOLEAN DEFAULT TRUE,
                difficulty VARCHAR(20) DEFAULT 'normal',
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Game settings table ready');

        // Create indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_game_saves_user_id ON game_saves(user_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_game_saves_last_played ON game_saves(last_played)
        `);
        console.log('✅ Indexes ready');

        console.log('✅ Database initialization complete');
        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { pool, testConnection, initializeDatabase };