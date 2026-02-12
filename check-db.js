const db = require('./backend/config/database');

console.log('=== FieldOps Database Analysis ===');

try {
    // List all tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables:', tables.map(t => t.name));
    
    // Check if users table exists
    const hasUsers = tables.some(t => t.name === 'users');
    console.log('Has users table:', hasUsers);
    
    // Check staff count
    if (hasUsers) {
        try {
            const staffCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE user_role != 'Customer'").get();
            console.log('Staff count:', staffCount.count);
        } catch (err) {
            console.log('Staff query error:', err.message);
        }
    }
    
    // Check jobs
    const jobsCount = db.prepare("SELECT COUNT(*) as count FROM jobs").get();
    console.log('Jobs count:', jobsCount.count);
    
    // Check customers
    const customersCount = db.prepare("SELECT COUNT(*) as count FROM customers").get();
    console.log('Customers count:', customersCount.count);
    
    // Check services
    const servicesCount = db.prepare("SELECT COUNT(*) as count FROM services").get();
    console.log('Services count:', servicesCount.count);
    
} catch (error) {
    console.error('Database error:', error.message);
}
