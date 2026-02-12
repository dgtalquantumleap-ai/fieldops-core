const db = require('./backend/config/database');

console.log('=== Checking Database Structure ===');

try {
    // Get all tables
    const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table'
        ORDER BY name
    `).all();
    
    console.log('Tables in database:');
    tables.forEach(table => {
        console.log(`  - ${table.name}`);
    });
    
    // Check if bookings table exists
    const bookingsTable = tables.find(t => t.name === 'bookings');
    if (bookingsTable) {
        console.log('\n✅ Bookings table exists');
        
        // Check bookings table structure
        const bookingsSchema = db.prepare(`
            PRAGMA table_info(bookings)
        `).all();
        
        console.log('\nBookings table structure:');
        bookingsSchema.forEach(column => {
            console.log(`  - ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
        });
        
        // Check recent bookings
        const recentBookings = db.prepare(`
            SELECT * FROM bookings 
            ORDER BY created_at DESC 
            LIMIT 3
        `).all();
        
        console.log(`\nRecent bookings (${recentBookings.length}):`);
        recentBookings.forEach(booking => {
            console.log(`  ID: ${booking.id}, Customer: ${booking.customer_name}, Date: ${booking.booking_date}`);
        });
    } else {
        console.log('\n❌ Bookings table does not exist');
    }
    
    // Check jobs table (for comparison)
    const jobsTable = tables.find(t => t.name === 'jobs');
    if (jobsTable) {
        console.log('\n✅ Jobs table exists');
        
        const recentJobs = db.prepare(`
            SELECT * FROM jobs 
            ORDER BY created_at DESC 
            LIMIT 3
        `).all();
        
        console.log(`\nRecent jobs (${recentJobs.length}):`);
        recentJobs.forEach(job => {
            console.log(`  ID: ${job.id}, Customer: ${job.customer_id}, Date: ${job.job_date}`);
        });
    }
    
} catch (error) {
    console.error('Error checking database:', error.message);
}
