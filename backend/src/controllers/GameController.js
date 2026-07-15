const GameState = require('../models/GameState');
const { registerUser, loginUser, generateToken } = require('../middleware/auth');
const { validateGameData } = require('../utils/gameValidator');

class GameController {

    // Register new user
    static async register(req, res) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password required' });
            }

            if (password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters' });
            }

            const user = await registerUser(username, password);
            const token = generateToken(user.id, user.username);

            res.status(201).json({
                message: 'User registered successfully',
                user: { id: user.id, username: user.username },
                token
            });

        } catch (err) {
            if (err.message === 'Username already exists') {
                res.status(400).json({ error: 'Username already exists' });
            } else {
                res.status(500).json({ error: err.message });
            }
        }
    }

    // Login user
    static async login(req, res) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password required' });
            }

            const result = await loginUser(username, password);

            res.json({
                message: 'Login successful',
                user: result.user,
                token: result.token
            });

        } catch (err) {
            res.status(401).json({ error: err.message });
        }
    }

    // Save game
    static async saveGame(req, res) {
        try {
            const userId = req.user.userId;
            const gameData = req.body;

            if (!gameData) {
                return res.status(400).json({ error: 'Game data required' });
            }

            if (!validateGameData(gameData)) {
                return res.status(400).json({ error: 'Invalid game data' });
            }

            const result = await GameState.saveGame(userId, gameData);

            res.json({
                message: 'Game saved successfully',
                data: result
            });

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Load game
    static async loadGame(req, res) {
        try {
            const userId = req.user.userId;
            const gameData = await GameState.loadGame(userId);

            if (!gameData) {
                return res.status(404).json({ error: 'No saved game found' });
            }

            res.json({
                message: 'Game loaded successfully',
                data: gameData
            });

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Delete game
    static async deleteGame(req, res) {
        try {
            const userId = req.user.userId;
            await GameState.deleteGame(userId);

            res.json({
                message: 'Game deleted successfully'
            });

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Pause game
    static async pauseGame(req, res) {
        try {
            const userId = req.user.userId;
            const gameData = req.body;

            if (!validateGameData(gameData)) {
                return res.status(400).json({ error: 'Invalid game data' });
            }

            const updated = await GameState.saveGame(userId, {
                ...gameData,
                state: 'paused'
            });

            res.json({
                message: 'Game paused',
                data: updated
            });

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Resume game
    static async resumeGame(req, res) {
        try {
            const userId = req.user.userId;
            const current = await GameState.loadGame(userId);

            if (!current) {
                return res.status(404).json({ error: 'No game found' });
            }

            const updated = await GameState.saveGame(userId, {
                chapter: current.chapter,
                progress: current.progress,
                state: 'playing'
            });

            res.json({
                message: 'Game resumed',
                data: updated
            });

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Player caught
    static async caught(req, res) {
        try {
            const userId = req.user.userId;

            const updated = await GameState.saveGame(userId, {
                state: 'caught',
                chapter: 1,
                progress: 0
            });

            res.json({
                message: 'Player caught',
                data: updated
            });

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Restart game
    static async restart(req, res) {
        try {
            const userId = req.user.userId;

            const fresh = await GameState.saveGame(userId, {
                state: 'playing',
                chapter: 1,
                progress: 0
            });

            res.json({
                message: 'Game restarted',
                data: fresh
            });

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Get settings
    static async getSettings(req, res) {
        try {
            const userId = req.user.userId;
            const settings = await GameState.getSettings(userId);

            res.json({
                message: 'Settings retrieved successfully',
                settings: settings || {
                    sound_enabled: true,
                    music_enabled: true,
                    difficulty: 'normal'
                }
            });

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Update settings
    static async updateSettings(req, res) {
        try {
            const userId = req.user.userId;
            const settings = req.body;

            const result = await GameState.updateSettings(userId, settings);

            res.json({
                message: 'Settings updated successfully',
                settings: result
            });

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Admin: get all saves
    static async getAllSaves(req, res) {
        try {
            const saves = await GameState.getAllSaves();

            res.json({
                message: 'All saves retrieved',
                saves
            });

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = GameController;