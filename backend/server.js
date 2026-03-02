const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// ============================================
// VALIDATE ENVIRONMENT VARIABLES
// ============================================
const REQUIRED_ENV = ['JWT_SECRET', 'EMAIL_USER', 'EMAIL_PASS', 'ADMIN_EMAIL'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error('\n❌ Missing required environment variables:');
  missing.forEach(v => console.error('   - ' + v));
  console.error('\nAdd them to your .env file. See .env.example\n');
  process.exit(1);
}

// Validate JWT_SECRET is strong enough
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.warn('\n⚠️  WARNING: JWT_SECRET is less than 32 characters.');
  console.warn('   Recommended: Use a 64+ character random string.\n');
}

// ============================================
// CORS CONFIGURATION
// ============================================
const getAllowedOrigins = () => {
  const allowed = process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://fieldops-core-production.up.railway.app';
  return allowed.split(',').map(origin => origin.trim());
};

const allowedOrigins = getAllowedOrigins();

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Request-ID']
};

// ============================================
// RATE LIMITING CONFIGURATION
// ============================================
const createRateLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: {
    success: false,
    error: 'Too many requests',
    message
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`🚫 Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil(windowMs / 60000)} minutes.`
    });
  }
});

const bookingLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 bookings per 15 minutes
  'Too many booking attempts. Please try again later.'
);

const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10, // 10 login attempts per 15 minutes
  'Too many login attempts. Please try again later.'
);

const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per 15 minutes
  'Too many requests. Please slow down.'
);

// ============================================
// EXPRESS & HTTP SERVER SETUP
// ============================================
const app = express();
const server = http.createServer(app);

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

// ============================================
// SOCKET.IO SETUP
// ============================================
const jwt = require('jsonwebtoken');

const io = socketIo(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Authenticate Socket.IO connections via JWT
io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
        // Allow unauthenticated connections but mark them as guests
        socket.user = null;
        return next();
    }
    try {
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        socket.user = null;
    }
    next();
});

// WebSocket connection for real-time updates
io.on('connection', (socket) => {
    console.log('🔌 Client connected for real-time updates');

    socket.on('join-room', (room) => {
        // Only authenticated users with admin/owner role can join the admin room
        if (room === 'admin') {
            const role = socket.user?.role;
            if (role !== 'admin' && role !== 'owner') {
                console.warn(`🚫 Unauthorized attempt to join admin room`);
                return;
            }
        }
        socket.join(room);
        console.log(`📱 Client joined room: ${room}`);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected');
    });
});

// Store io instance for real-time updates
app.set('io', io);

// ============================================
// MIDDLEWARE SETUP - ORDER MATTERS!
// ============================================
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request tracking middleware with safe loading
try {
  const { requestTracking } = require('./middleware/logging');
  app.use(requestTracking);
  console.log('✅ Request tracking middleware loaded');
} catch (err) {
  console.warn('⚠️  Request tracking middleware not found, continuing without it');
}

// ============================================
// FAVICON HANDLER - Prevent 404 errors
// ============================================
app.get('/favicon.ico', (req, res) => {
    res.status(200).set('Content-Type', 'image/svg+xml').send(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90"><rect x="4" y="60" width="17" height="28" rx="1.5" fill="#1B2A72"/><rect x="79" y="60" width="17" height="28" rx="1.5" fill="#1B2A72"/><polygon points="12.5,60 50,8 87.5,60 76,60 50,24 24,60" fill="#1B2A72"/><polygon points="37,2 63,2 50,20" fill="#CC2936"/><polygon points="50,14 54,20 46,20" fill="#1B2A72"/></svg>`
    );
});

// ============================================
// BLOCK DEVELOPER-ONLY PAGES FROM PUBLIC ACCESS
// ============================================
['/test-api.html', '/booking.html.backup'].forEach(p => {
    app.get(p, (_req, res) => res.status(404).json({ success: false, error: 'Not Found' }));
});

// ============================================
// STATIC FILE SERVING - SPECIFIC BEFORE GENERAL
// ============================================
app.use('/uploads', express.static('uploads'));
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin')));
app.use('/staff', express.static(path.join(__dirname, '../frontend/staff-app')));
app.use('/stiltheights', express.static(path.join(__dirname, '../frontend/stiltheights'))); // legacy alias kept
app.use('/website', express.static(path.join(__dirname, '../frontend/website')));
app.use(express.static(path.join(__dirname, '../frontend')));

// ============================================
// STATIC PAGE ROUTES - AFTER STATIC MIDDLEWARE
// ============================================
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin/index.html'));
});

app.get('/mobile', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/mobile-access.html'));
});

app.get('/admin-ai', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin-ai-dashboard.html'));
});

// ============================================
// RATE LIMITING - APPLIED BEFORE ROUTES
// ============================================
app.use('/api/auth/login', authLimiter);
app.use('/api/booking/book', bookingLimiter);
app.use('/api/', generalLimiter);

// ============================================
// API ROUTES - WITH PROPER AUTHENTICATION
// ============================================
const { requireAuth, requireAdmin } = require('./middleware/auth');

// Public routes (no auth required)
app.use('/api/auth',             require('./routes/auth'));
app.use('/api/booking',          require('./routes/booking'));
app.use('/api/branding',         require('./routes/branding'));
app.use('/api/scheduling',        require('./routes/scheduling'));
// app.use('/api/ai-test',          require('./routes/ai-test'));
// app.use('/api/webhooks',         require('./routes/webhooks'));  // Google Forms integration

// Protected routes (auth required)
app.use('/api/customers',        requireAuth,  require('./routes/customers'));
app.use('/api/jobs',             requireAuth,  require('./routes/jobs'));
app.use('/api/staff',            requireAuth,  require('./routes/staff'));
app.use('/api/invoices',         requireAuth,  require('./routes/invoices'));
app.use('/api/dashboard',        requireAuth,  require('./routes/dashboard'));
app.use('/api/media',            requireAuth,  require('./routes/media'));
app.use('/api/automations',      requireAuth,  require('./routes/automations'));
app.use('/api/ai-automations',   requireAuth,  require('./routes/ai-automations'));
app.use('/api/services',         requireAuth,  require('./routes/services-enhanced'));
app.use('/api/analytics',        requireAuth,  require('./routes/analytics'));
app.use('/api/wp',               requireAuth,  require('./routes/wordpress'));
app.use('/api/push',             requireAuth,  require('./routes/push'));
app.use('/api/accounting',       requireAuth,  require('./routes/accounting'));
app.use('/api/job-expenses',     requireAuth,  require('./routes/job-expenses'));

// Feature routes (features 1-14)
app.use('/api/notifications',    requireAdmin, require('./routes/notifications'));
app.use('/api/waiting-list',     requireAuth,  require('./routes/waiting-list'));
app.use('/api/reviews',          requireAuth,  require('./routes/reviews'));

// Public review submission (no auth — customers click a link in email)
app.use('/api/public/reviews',   require('./routes/reviews'));

// Admin-only routes
app.use('/api/staff-management', requireAdmin, require('./routes/staff-management'));
app.use('/api/settings',         requireAdmin, require('./routes/settings'));
app.use('/api/admin-audit',       requireAdmin, require('./routes/admin-audit'));
app.use('/api/onboarding',       requireAdmin, require('./routes/onboarding'));

// ============================================
// ROOT REDIRECT
// ============================================
app.get('/', (req, res) => res.redirect('/stiltheights'));

// ============================================
// CATCH-ALL 404 HANDLER
// ============================================
app.use((req, res) => {
    console.warn(`⚠️  404 Not Found: ${req.method} ${req.path}`);
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `The requested endpoint does not exist: ${req.method} ${req.path}`
    });
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
app.use((err, req, res, next) => {
    console.error('❌ Error occurred:', {
        message: err.message,
        path: req.path,
        method: req.method,
        stack: err.stack
    });
    
    res.status(err.status || 500).json({
        success: false,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        requestId: req.id
    });
});

// ============================================
// SERVER STARTUP
// ============================================
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

server.listen(PORT, '0.0.0.0', () => {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     ✅ FieldOps Core - Operations System Ready         ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log('🚀 Server Information:');
    console.log(`   Port: ${PORT}`);
    console.log(`   URL: ${APP_URL}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    
    console.log('\n📍 Access Points:');
    console.log(`   🏠 Website: ${APP_URL}/website`);
    console.log(`   📊 Admin: ${APP_URL}/admin`);
    console.log(`   📱 Staff: ${APP_URL}/staff`);
    console.log(`   📝 Booking: ${APP_URL}/booking.html`);
    
    console.log('\n🔧 Features:');
    console.log('   ⚡ Real-time updates (Socket.io)');
    console.log('   🔒 Authentication & Authorization');
    console.log('   🚫 Rate limiting enabled');
    console.log('   🌐 CORS configured');
    console.log(`   📡 Allowed Origins: ${allowedOrigins.join(', ')}`);
    
    // ============================================
    // Initialize automated schedulers
    // ============================================
    const { runMigrations } = require('./config/migrate');
    runMigrations()
      .then(() => console.log('   ✅ Database migrations complete'))
      .catch(err => console.warn('   ⚠️  Migration failed (non-critical):', err.message));

    try {
      const scheduler = require('./utils/scheduler');
      scheduler.initSchedulers();
      console.log('   🔄 Automated schedulers initialized (follow-ups, reminders, etc.)');
    } catch (error) {
      console.warn('   ⚠️  Scheduler initialization failed:', error.message);
      console.warn('   → Install node-cron: npm install node-cron');
    }
    
    console.log('\n');
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGTERM', () => {
    console.log('\n⚠️  SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n⚠️  SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, io };
