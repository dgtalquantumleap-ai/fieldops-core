const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
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

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

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
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin')));
app.use('/staff', express.static(path.join(__dirname, '../frontend/staff-app')));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/stiltheights', express.static(path.join(__dirname, '../frontend/stiltheights')));

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
app.use('/api/wp',               requireAuth,  require('./routes/wordpress'));

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