const express = require('express');
const router = express.Router();

const GameController = require('../controllers/gameController');
const { verifyToken } = require('../middleware/auth');


// =========================
// 🔓 PUBLIC ROUTES
// =========================

// Register user
router.post('/register', GameController.register);

// Login user
router.post('/login', GameController.login);


// =========================
// 🔒 PROTECTED ROUTES
// =========================

// Save game
router.post('/save', verifyToken, GameController.saveGame);

// Load game
router.get('/load', verifyToken, GameController.loadGame);

// Delete save
router.delete('/delete', verifyToken, GameController.deleteGame);


// =========================
// 🎮 GAMEPLAY ROUTES
// =========================

// Pause game
router.post('/pause', verifyToken, GameController.pauseGame);

// Resume game
router.post('/resume', verifyToken, GameController.resumeGame);

// Player caught
router.post('/caught', verifyToken, GameController.caught);

// Restart game
router.post('/restart', verifyToken, GameController.restart);


// =========================
// ⚙️ SETTINGS
// =========================

// Get settings
router.get('/settings', verifyToken, GameController.getSettings);

// Update settings
router.put('/settings', verifyToken, GameController.updateSettings);


// =========================
// 🛠 ADMIN
// =========================

// Get all saves (protect with admin check later)
router.get('/all-saves', verifyToken, GameController.getAllSaves);


module.exports = router;