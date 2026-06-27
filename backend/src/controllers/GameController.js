const GameState = require('../models/GameState');
const { registerUser, loginUser, generateToken } = require('../middleware/auth');

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

    // Get settings
    static async getSettings(req, res) {
        try {
            const userId = req.user.userId;
            const settings = await GameState.getSettings(userId);
            
            res.json({
                message: 'Settings retrieved successfully',
                settings: settings || { sound_enabled: true, music_enabled: true, difficulty: 'normal' }
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

    // Get all saves (admin only)
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