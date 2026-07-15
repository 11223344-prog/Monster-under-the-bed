const { pool } = require('../config/database');

class GameState {

    // ✅ SAVE GAME
    static async saveGame(userId, gameData) {
        try {
            const { chapter, progress, state } = gameData;

            // 🔒 Validation
            if (!chapter || progress === undefined || !state) {
                throw new Error("Invalid game data");
            }

            const result = await pool.query(
                `INSERT INTO game_saves (user_id, game_state, chapter, progress, last_played)
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                 ON CONFLICT (user_id) DO UPDATE SET 
                 game_state = EXCLUDED.game_state,
                 chapter = EXCLUDED.chapter,
                 progress = EXCLUDED.progress,
                 last_played = EXCLUDED.last_played
                 RETURNING id, user_id, chapter, progress, game_state`,
                [userId, state, chapter, progress]
            );

            return result.rows[0];

        } catch (err) {
            throw new Error("SaveGame Error: " + err.message);
        }
    }

    // ✅ LOAD GAME
    static async loadGame(userId) {
        try {
            const result = await pool.query(
                'SELECT * FROM game_saves WHERE user_id = $1',
                [userId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];

        } catch (err) {
            throw new Error("LoadGame Error: " + err.message);
        }
    }

    // ✅ DELETE SAVE
    static async deleteGame(userId) {
        try {
            await pool.query(
                'DELETE FROM game_saves WHERE user_id = $1',
                [userId]
            );

            return { deleted: true, userId };

        } catch (err) {
            throw new Error("DeleteGame Error: " + err.message);
        }
    }

    // ✅ GET SETTINGS
    static async getSettings(userId) {
        try {
            const result = await pool.query(
                'SELECT * FROM game_settings WHERE user_id = $1',
                [userId]
            );

            // 🔥 Default settings if none exist
            return result.rows.length > 0
                ? result.rows[0]
                : {
                    sound_enabled: true,
                    music_enabled: true,
                    difficulty: "normal"
                };

        } catch (err) {
            throw new Error("GetSettings Error: " + err.message);
        }
    }

    // ✅ UPDATE SETTINGS
    static async updateSettings(userId, settings) {
        try {
            const {
                sound_enabled = true,
                music_enabled = true,
                difficulty = "normal"
            } = settings;

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

        } catch (err) {
            throw new Error("UpdateSettings Error: " + err.message);
        }
    }

    // ✅ ADMIN: GET ALL SAVES
    static async getAllSaves() {
        try {
            const result = await pool.query(
                `SELECT gs.*, u.username 
                 FROM game_saves gs 
                 JOIN users u ON gs.user_id = u.id 
                 ORDER BY gs.last_played DESC`
            );

            return result.rows;

        } catch (err) {
            throw new Error("GetAllSaves Error: " + err.message);
        }
    }
}

module.exports = GameState;