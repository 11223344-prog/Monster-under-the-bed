const express = require('express');
const router = express.Router();
const GameController = require('../controllers/gameController');
const { verifyToken } = require('../middleware/auth');

// Public routes (no authentication required)
router.post('/register', GameController.register);
router.post('/login', GameController.login);

// Protected routes (authentication required)
router.post('/save', verifyToken, GameController.saveGame);
router.get('/load', verifyToken, GameController.loadGame);
router.delete('/delete', verifyToken, GameController.deleteGame);
router.get('/settings', verifyToken, GameController.getSettings);
router.put('/settings', verifyToken, GameController.updateSettings);

// Admin route (add admin check in production)
router.get('/all-saves', verifyToken, GameController.getAllSaves);

module.exports = router;