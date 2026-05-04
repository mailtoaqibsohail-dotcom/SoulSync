const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const errorHandler = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const authRoutes = require('../routes/auth');
const documentRoutes = require('../routes/documents');
const clientRoutes = require('../routes/clients');
const projectRoutes = require('../routes/projects');
const userRoutes = require('../routes/users');
const mocRoutes = require('../routes/mocs');

const app = express();

// Trust Apache reverse proxy so rate limiter sees real client IPs
app.set('trust proxy', 1);

// Security headers (CSP relaxed to allow CDN fonts/icons and inline handlers)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:    ["'self'", "'unsafe-inline'"],
      scriptSrcAttr:["'unsafe-inline'"],
      styleSrc:     ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc:      ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc:       ["'self'", "data:", "blob:"],
      connectSrc:   ["'self'"],
      frameSrc:     ["'self'", "blob:"],
      objectSrc:    ["'self'", "blob:"],
    }
  }
}));

// CORS — tighten origin in production
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.BASE_URL, 'https://spark.proflowenergy.org', 'http://spark.proflowenergy.org']
    : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) }
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiter
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
}));

// Serve generated PDFs
app.use('/uploads', express.static(
  process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads')
));

// Serve frontend static files
const PUBLIC_DIR = path.join(__dirname, '../../public_html');
app.use(express.static(PUBLIC_DIR));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/mocs', mocRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback — all non-API routes serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// 404 for unmatched API routes only
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Central error handler
app.use(errorHandler);

module.exports = app;
