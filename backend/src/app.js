require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { testConnection, initializeDatabase } = require('./config/database');
const gameRoutes = require('./routes/gameRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:5000'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '../../frontend')));

// Routes
app.use('/api/game', gameRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
    const dbStatus = await testConnection();
    res.json({
        status: 'OK',
        message: 'Monster Under The Bed API is running',
        database: dbStatus ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Initialize database and start server
async function startServer() {
    try {
        // Test database connection
        const isConnected = await testConnection();
        
        if (isConnected) {
            // Initialize database tables
            await initializeDatabase();
            
            // Start server
            app.listen(PORT, () => {
                console.log(`🚀 Server running on port ${PORT}`);
                console.log(`📁 Frontend: http://localhost:${PORT}`);
                console.log(`📡 API: http://localhost:${PORT}/api`);
                console.log(`🗄️  Database: PostgreSQL connected`);
            });
        } else {
            console.error('❌ Cannot start server without database connection');
            console.log('Please check your .env file and make sure PostgreSQL is running');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Server startup failed:', error.message);
        process.exit(1);
    }
}

startServer();