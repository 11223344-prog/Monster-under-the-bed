const { pool } = require('../config/database');

class GameState {
    // Save game state
    static async saveGame(userId, gameData) {
        const { chapter, progress, state } = gameData;
        
        const result = await pool.query(
            `INSERT INTO game_saves (user_id, game_state, chapter, progress, last_played)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id) DO UPDATE SET 
             game_state = EXCLUDED.game_state,
             chapter = EXCLUDED.chapter,
             progress = EXCLUDED.progress,
             last_played = EXCLUDED.last_played
             RETURNING id, user_id, chapter, progress`,
            [userId, state, chapter, progress]
        );
        
        return result.rows[0];
    }

    // Load game state
    static async loadGame(userId) {
        const result = await pool.query(
            'SELECT * FROM game_saves WHERE user_id = $1',
            [userId]
        );
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return result.rows[0];
    }

    // Delete game save
    static async deleteGame(userId) {
        await pool.query(
            'DELETE FROM game_saves WHERE user_id = $1',
            [userId]
        );
        return { deleted: true, userId };
    }

    // Get user settings
    static async getSettings(userId) {
        const result = await pool.query(
            'SELECT * FROM game_settings WHERE user_id = $1',
            [userId]
        );
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    // Update user settings
    static async updateSettings(userId, settings) {
        const { sound_enabled, music_enabled, difficulty } = settings;
        
        const result = await pool.query(
            `INSERT INTO game_settings (user_id, sound_enabled, music_enabled, difficulty)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id) DO UPDATE SET 
             sound_enabled = EXCLUDED.sound_enabled,
             music_enabled = EXCLUDED.music_enabled,
             difficulty = EXCLUDED.difficulty
             RETURNING *`,
            [userId, sound_enabled, music_enabled, difficulty]
        );
        
        return result.rows[0];
    }

    // Get all saves (for admin)
    static async getAllSaves() {
        const result = await pool.query(
            `SELECT gs.*, u.username 
             FROM game_saves gs 
             JOIN users u ON gs.user_id = u.id 
             ORDER BY gs.last_played DESC`
        );
        return result.rows;
    }
}

module.exports = GameState;