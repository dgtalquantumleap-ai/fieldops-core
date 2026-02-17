const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Validate required environment variables
const REQUIRED_ENV = ['JWT_SECRET', 'EMAIL_USER', 'EMAIL_PASS', 'ADMIN_EMAIL'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error('\n❌ Missing required environment variables:');
  missing.forEach(v => console.error('   - ' + v));
  console.error('\nAdd them to your .env file. See .env.example\n');
  process.exit(1);
}

// Configure allowed origins for CORS
const getAllowedOrigins = () => {
  const allowed = process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://fieldops-core-production.up.railway.app';
  return allowed.split(',').map(origin => origin.trim());
};

const allowedOrigins = getAllowedOrigins();

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('🚫 CORS blocked request from:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Request-ID']
};

// Rate limiting configuration
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

// Different rate limits for different endpoints
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

const strictLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  1000, // 1000 requests per hour
  'Rate limit exceeded for this hour.'
);

const app = express();
const server = http.createServer(app);

// Trust proxy for Railway deployment
app.set('trust proxy', 1);
const io = socketIo(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Add request tracking middleware
const { requestTracking } = require('./middleware/logging');
app.use(requestTracking);

// Apply rate limiting
app.use('/api/booking/book', bookingLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/', generalLimiter);

// Store io instance for real-time updates
app.set('io', io);

// WebSocket connection for real-time updates
io.on('connection', (socket) => {
    console.log('🔌 Client connected for real-time updates');
    
    socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`📱 Client joined room: ${room}`);
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected');
    });
});

// Serve static files
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin/index.html'));
});

// AI Dashboard
app.get('/admin-ai', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin-ai-dashboard.html'));
});

// Enhanced Booking Page
app.get('/booking-enhanced', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/booking-enhanced.html'));
});

// Static file serving for specific directories
app.use('/staff', express.static(path.join(__dirname, '../frontend/staff-app')));
app.use('/stiltheights', express.static(path.join(__dirname, '../frontend/stiltheights')));
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
const { requireAuth, requireAdmin } = require('./middleware/auth');

app.use('/api/auth',             require('./routes/auth'));           // public
app.use('/api/booking',          require('./routes/booking'));        // public
app.use('/api/customers',        requireAuth,  require('./routes/customers'));
app.use('/api/jobs',             requireAuth,  require('./routes/jobs'));
app.use('/api/staff',            requireAuth,  require('./routes/staff'));
app.use('/api/staff-management', requireAdmin, require('./routes/staff-management'));
app.use('/api/invoices',         requireAuth,  require('./routes/invoices'));
app.use('/api/dashboard',        requireAuth,  require('./routes/dashboard'));
app.use('/api/settings',          requireAdmin, require('./routes/settings'));
app.use('/api/onboarding',       requireAdmin, require('./routes/onboarding'));
app.use('/api/media',            requireAuth,  require('./routes/media'));
app.use('/api/automations',      requireAdmin, require('./routes/automations'));
app.use('/api/ai-automations',    requireAuth, require('./routes/ai-automations'));
app.use('/api/ai-test',           require('./routes/ai-test'));           // AI testing endpoint
app.use('/api/wp',               requireAuth, require('./routes/wordpress'));

// Root redirect to Stilt Heights website
app.get('/', (req, res) => res.redirect('/stiltheights'));

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ FieldOps Core running on port ${PORT}`);
    console.log(`🌐 External access: http://10.0.0.104:${PORT}`);
    console.log(`🏠 Stilt Heights Website: http://localhost:${PORT}/stiltheights`);
    console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
    console.log(`📱 Staff App: http://localhost:${PORT}/staff`);
    console.log(`📝 Customer Booking: http://localhost:${PORT}/booking.html`);
    console.log(` Real-time updates enabled`);
});