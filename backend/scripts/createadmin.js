const User = require('../models/User');

async function createAdmin() {
    await User.create({
        name: 'Admin',
        email: 'admin@fieldops.com',
        password: 'admin123',
        role: 'admin'
    });
    console.log('✅ Admin created');
    process.exit(0);
}

createAdmin();