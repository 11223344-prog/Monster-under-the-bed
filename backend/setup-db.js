const { Pool } = require('pg');
require('dotenv').config();

async function setupDatabase() {
    console.log('🗄️  Setting up PostgreSQL database...');
    
    // First connect to default postgres database
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: 'postgres'
    });

    try {
        // Check if database exists
        const checkResult = await pool.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [process.env.DB_NAME || 'monster_game_db']
        );
        
        if (checkResult.rows.length === 0) {
            await pool.query(
                `CREATE DATABASE ${process.env.DB_NAME || 'monster_game_db'}`
            );
            console.log('✅ Database created');
        } else {
            console.log('✅ Database already exists');
        }
        
        await pool.end();

        // Connect to new database
        const dbPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'monster_game_db'
        });

        // Create tables
        await dbPool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Users table created');

        await dbPool.query(`
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
        console.log('✅ Game saves table created');

        await dbPool.query(`
            CREATE TABLE IF NOT EXISTS game_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE NOT NULL,
                sound_enabled BOOLEAN DEFAULT TRUE,
                music_enabled BOOLEAN DEFAULT TRUE,
                difficulty VARCHAR(20) DEFAULT 'normal',
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Game settings table created');

        await dbPool.query(`
            CREATE INDEX IF NOT EXISTS idx_game_saves_user_id ON game_saves(user_id)
        `);
        await dbPool.query(`
            CREATE INDEX IF NOT EXISTS idx_game_saves_last_played ON game_saves(last_played)
        `);
        console.log('✅ Indexes created');

        console.log('\n🎉 Database setup complete!');
        console.log(`📁 Database: ${process.env.DB_NAME || 'monster_game_db'}`);
        console.log(`🔗 Connection: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);

        await dbPool.end();

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        console.log('\n📝 Please check:');
        console.log('1. PostgreSQL is running');
        console.log('2. Password in .env is correct');
        console.log('3. PostgreSQL is on port 5432');
    }
}

setupDatabase();