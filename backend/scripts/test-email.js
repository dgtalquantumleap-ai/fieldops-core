const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailConfig() {
    console.log('🔧 Testing email configuration...');
    console.log('Email User:', process.env.EMAIL_USER);
    console.log('Email Pass exists:', !!process.env.EMAIL_PASS);
    console.log('Admin Email:', process.env.ADMIN_EMAIL);
    
    // Create transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        debug: true, // Show debug output
        logger: true  // Show logs
    });

    // Verify connection
    try {
        console.log('🔍 Verifying transporter connection...');
        await transporter.verify();
        console.log('✅ Transporter connection verified');
    } catch (error) {
        console.error('❌ Transporter verification failed:', error);
        return false;
    }

    // Send test email
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL, // Send to admin for testing
        subject: '🧪 FieldOps Email Test',
        html: `
            <h2>Email Configuration Test</h2>
            <p>This is a test email from FieldOps booking system.</p>
            <p>If you receive this, email configuration is working correctly!</p>
            <p>Time: ${new Date().toLocaleString()}</p>
        `
    };

    try {
        console.log('📧 Sending test email...');
        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', result.messageId);
        return true;
    } catch (error) {
        console.error('❌ Failed to send test email:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // Common Gmail issues and solutions
        if (error.code === 'EAUTH') {
            console.log('\n🔧 Gmail Authentication Issues:');
            console.log('1. Make sure you\'re using an App Password, not your regular password');
            console.log('2. Enable 2-factor authentication on your Google account');
            console.log('3. Generate an App Password at: https://myaccount.google.com/apppasswords');
            console.log('4. Use the 16-character App Password in EMAIL_PASS');
        }
        
        if (error.code === 'ECONNECTION') {
            console.log('\n🔧 Connection Issues:');
            console.log('1. Check your internet connection');
            console.log('2. Make sure Gmail SMTP isn\'t blocked by your firewall');
            console.log('3. Try using a different network');
        }
        
        return false;
    }
}

// Test the booking email specifically
async function testBookingEmail() {
    console.log('\n🧪 Testing booking email format...');
    
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const bookingData = {
        name: 'Test Customer',
        email: process.env.ADMIN_EMAIL, // Send to admin for testing
        service: 'Regular Housekeeping',
        date: '2024-01-30',
        time: '10:00',
        address: '123 Test Street'
    };

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: bookingData.email,
        subject: 'Booking Confirmation - Stilt Heights',
        html: `
            <h2>Booking Confirmed!</h2>
            <p>Hi ${bookingData.name},</p>
            <p>Your booking has been confirmed. Here are the details:</p>
            <ul>
                <li><strong>Service:</strong> ${bookingData.service}</li>
                <li><strong>Date:</strong> ${bookingData.date}</li>
                <li><strong>Time:</strong> ${bookingData.time}</li>
                <li><strong>Location:</strong> ${bookingData.address}</li>
            </ul>
            <p>We'll see you soon!</p>
            <p>Best regards,<br>Stilt Heights Team</p>
        `
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Booking email test sent successfully!');
        return true;
    } catch (error) {
        console.error('❌ Booking email test failed:', error);
        return false;
    }
}

// Run tests
async function runEmailTests() {
    console.log('🚀 Starting FieldOps Email Diagnostic Tests\n');
    
    const basicTest = await testEmailConfig();
    
    if (basicTest) {
        await testBookingEmail();
        console.log('\n🎉 All email tests passed! Your booking system should work now.');
    } else {
        console.log('\n❌ Email configuration needs fixing. See error messages above.');
    }
}

// Run if called directly
if (require.main === module) {
    runEmailTests().catch(console.error);
}

module.exports = { testEmailConfig, testBookingEmail, runEmailTests };
