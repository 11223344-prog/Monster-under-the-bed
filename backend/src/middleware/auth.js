const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Hash password
const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

// Compare password
const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

// Generate JWT token
const generateToken = (userId, username) => {
    return jwt.sign(
        { userId, username },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Verify JWT token middleware
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Register user
const registerUser = async (username, password) => {
    try {
        const hashedPassword = await hashPassword(password);
        const result = await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
            [username, hashedPassword]
        );
        return result.rows[0];
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            throw new Error('Username already exists');
        }
        throw error;
    }
};

// Login user
const loginUser = async (username, password) => {
    const result = await pool.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
    );
    
    if (result.rows.length === 0) {
        throw new Error('User not found');
    }
    
    const user = result.rows[0];
    const isValid = await comparePassword(password, user.password);
    
    if (!isValid) {
        throw new Error('Invalid password');
    }
    
    const token = generateToken(user.id, user.username);
    return { user: { id: user.id, username: user.username }, token };
};

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken,
    registerUser,
    loginUser
};