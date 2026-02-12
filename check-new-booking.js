const db = require('./backend/config/database');

console.log('=== Checking New Booking ===');

try {
    // Check all recent bookings
    const bookings = db.prepare(`
        SELECT * FROM bookings 
        ORDER BY created_at DESC 
        LIMIT 5
    `).all();
    
    console.log(`Total bookings found: ${bookings.length}`);
    
    bookings.forEach((booking, index) => {
        console.log(`\n${index + 1}. Booking ID: ${booking.id}`);
        console.log(`   Customer: ${booking.customer_name}`);
        console.log(`   Email: ${booking.customer_email}`);
        console.log(`   Service: ${booking.service_name}`);
        console.log(`   Date: ${booking.booking_date}`);
        console.log(`   Time: ${booking.booking_time}`);
        console.log(`   Status: ${booking.status}`);
        console.log(`   Created: ${booking.created_at}`);
    });
    
    // Check if there's a booking for olumide Akinsola
    const specificBooking = db.prepare(`
        SELECT * FROM bookings 
        WHERE customer_name LIKE '%olumide%' OR customer_email = 'info@ebenova.net'
    `).all();
    
    if (specificBooking.length > 0) {
        console.log(`\n✅ Found booking for olumide Akinsola:`);
        specificBooking.forEach(booking => {
            console.log(`   ID: ${booking.id}, Status: ${booking.status}, Date: ${booking.booking_date}`);
        });
    } else {
        console.log('\n❌ No booking found for olumide Akinsola');
    }
    
} catch (error) {
    console.error('Error checking bookings:', error.message);
}
