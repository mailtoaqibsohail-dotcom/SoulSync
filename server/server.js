require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
app.set('io', io); // make io accessible in routes
initSocket(io);

// ── Connect DB ────────────────────────────────────────────
connectDB();

// ── Static files (React build) ────────────────────────────
app.use(express.static(path.join(__dirname, '../client/build')));

// ── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting — prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: 'Too many requests, please try again later' },
});
app.use('/api/auth', authLimiter);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
app.use('/api', generalLimiter);

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/matches', require('./routes/matches'));

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── SPA fallback — serve React app for all non-API routes ─
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// ── 404 handler (API routes only) ────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Start server ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
