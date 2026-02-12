const nodemailer = require('nodemailer');
require('dotenv').config();

async function testBookingEmailFlow() {
    console.log('🧪 Testing complete booking email flow...');
    
    // Import the actual notification function
    const { sendCustomerConfirmation, sendAdminNotification } = require('../utils/notifications');
    
    // Simulate a booking
    const testBooking = {
        name: 'Test Customer',
        email: 'dgtalquantumleap@gmail.com', // Your email for testing
        phone: '555-123-4567',
        service: 'Regular Housekeeping',
        date: '2024-01-30',
        time: '10:00',
        address: '123 Test Street, Test City',
        notes: 'Test booking for email verification'
    };
    
    try {
        console.log('📧 Sending customer confirmation...');
        await sendCustomerConfirmation(testBooking);
        console.log('✅ Customer confirmation sent!');
        
        console.log('📧 Sending admin notification...');
        await sendAdminNotification(testBooking);
        console.log('✅ Admin notification sent!');
        
        console.log('\n🎉 Booking email flow test completed successfully!');
        console.log('📬 Check your inbox for both emails.');
        
    } catch (error) {
        console.error('❌ Booking email flow test failed:', error);
    }
}

// Run the test
testBookingEmailFlow();
