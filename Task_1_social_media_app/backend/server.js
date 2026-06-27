const express = require('express');
const cors = require('cors');
const path = require('path');

// ── Initialize DB (runs schema creation) ──
require('./database');

// ── Routes ──
const authRoutes     = require('./routes/auth');
const userRoutes     = require('./routes/users');
const postRoutes     = require('./routes/posts');
const commentRoutes  = require('./routes/comments');
const likeRoutes     = require('./routes/likes');

const app = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────
//  Middleware
// ─────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─────────────────────────────────────────
//  API Routes
// ─────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/posts',    postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes',    likeRoutes);

// ─────────────────────────────────────────
//  Health Check
// ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────
//  Serve frontend for all other routes (SPA fallback)
// ─────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ─────────────────────────────────────────
//  Start Server
// ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Social Media Server running at: http://localhost:${PORT}`);
  console.log(`📂 Frontend served from:           /frontend`);
  console.log(`🗄️  Database:                       social_media.db`);
  console.log(`\nPress Ctrl+C to stop.\n`);
});

module.exports = app;
