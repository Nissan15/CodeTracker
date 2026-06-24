require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Import passport strategy configuration
require('./controllers/auth.controller');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const questionRoutes = require('./routes/question.routes');
const platformRoutes = require('./routes/platform.routes');
const contestRoutes = require('./routes/contest.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// ─── Startup Diagnostics ─────────────────────────────────────────────────────
console.log('🔍 Startup diagnostics:');
console.log(`   NODE_ENV     : ${process.env.NODE_ENV || '(not set)'}`);
console.log(`   PORT         : ${process.env.PORT || '(not set, will use 5000)'}`);
console.log(`   MONGODB_URI  : ${process.env.MONGODB_URI ? '✅ set' : '❌ MISSING'}`);
console.log(`   JWT_SECRET   : ${process.env.JWT_SECRET ? '✅ set' : '❌ MISSING'}`);
console.log(`   FRONTEND_URL : ${process.env.FRONTEND_URL || '(not set)'}`);
console.log(`   GOOGLE_ID    : ${process.env.GOOGLE_CLIENT_ID ? '✅ set' : '⚠️  not set (Google OAuth disabled)'}`);

// Connect to MongoDB (with retry — will NOT exit process on failure)
connectDB().then(() => {
  // Start background cron jobs once DB is connected
  require('./cron');
}).catch((err) => {
  console.error('Unhandled error in connectDB:', err?.message);
});

// ─── Middleware ───────────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== 'production';

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  // Allow localhost only in development
  ...(isDev
    ? ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500']
    : []),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // 'null' string = file:// protocol, no origin = curl/mobile — allow in dev only
      if (ALLOWED_ORIGINS.includes(origin) || (!origin && isDev) || (origin === 'null' && isDev)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const dbState = require('mongoose').connection.readyState;
  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';
  res.json({
    status: 'OK',
    message: 'CodeTracker API is running 🚀',
    db: dbStatus,
    env: process.env.NODE_ENV || 'development',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CodeTracker Backend running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

server.on('error', (err) => {
  console.error('❌ Server failed to start:', err.message);
  process.exit(1);
});

module.exports = app;
