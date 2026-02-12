// backend/scripts/updateServices.js - FIXED VERSION
const db = require('../config/database');

try {
    console.log('🔄 Updating services for Stilt Heights...');
    
    // Don't delete - just update existing and add new ones
    const existingServices = db.prepare('SELECT * FROM services').all();
    
    if (existingServices.length > 0) {
        console.log('📝 Updating existing services...');
        
        // Clear existing services safely
        const updateService = db.prepare('UPDATE services SET name = ?, price = ?, description = ? WHERE id = ?');
        
        if (existingServices[0]) updateService.run('Regular Housekeeping', 200.00, 'Monthly recurring housekeeping service', existingServices[0].id);
        if (existingServices[1]) updateService.run('One-time Cleaning', 80.00, 'Per hour one-time cleaning service', existingServices[1].id);
        if (existingServices[2]) updateService.run('Recurring Office Cleaning', 120.00, 'Per hour recurring office cleaning', existingServices[2].id);
        if (existingServices[3]) updateService.run('Carpet Cleaning', 150.00, 'Professional carpet cleaning service', existingServices[3].id);
    }
    
    // Add any new services
    const insertService = db.prepare('INSERT OR IGNORE INTO services (name, price, description) VALUES (?, ?, ?)');
    
    insertService.run('Window Cleaning', 100.00, 'Interior and exterior window cleaning');
    insertService.run('Move In & Out Cleaning', 250.00, 'Complete move in/out cleaning service');
    insertService.run('Event Cleanup', 180.00, 'Post-event cleaning service');
    insertService.run('Laundry Services', 50.00, 'Professional laundry services');
    insertService.run('Dish Washing', 40.00, 'Dish washing service');
    
    console.log('✅ Stilt Heights services updated successfully!');
    
    // Show all services
    const allServices = db.prepare('SELECT * FROM services').all();
    console.log('\n📋 Current Services:');
    allServices.forEach(s => {
        console.log(`   - ${s.name}: $${s.price}`);
    });
    
    db.close();
    process.exit(0);
} catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
}