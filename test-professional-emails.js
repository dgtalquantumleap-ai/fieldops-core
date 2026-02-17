const axios = require('axios');

async function testProfessionalEmails() {
    console.log('🧪 Testing Professional Email Templates...\n');
    
    try {
        // Test 1: Create a booking to trigger professional booking confirmation
        console.log('📧 Test 1: Booking Confirmation Email');
        console.log('=' .repeat(50));
        
        const bookingResponse = await axios.post('https://fieldops-production-6b97.up.railway.app/api/booking/book', {
            name: 'Professional Email Test',
            email: 'dgtalquantumleap@gmail.com',
            phone: '(555) 123-4567',
            service: 'Deep Cleaning',
            date: '2026-02-20',
            time: '14:00',
            address: '123 Test Street, Test City, TC 12345',
            notes: 'Test professional email template'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Booking created successfully!');
        console.log('📋 Booking ID:', bookingResponse.data.data?.id);
        console.log('📧 Professional booking confirmation email should be sent to: dgtalquantumleap@gmail.com\n');
        
        // Test 2: Create an invoice to trigger professional invoice email
        console.log('💰 Test 2: Professional Invoice Email');
        console.log('=' .repeat(50));
        
        // First login to get token
        const loginResponse = await axios.post('https://fieldops-production-6b97.up.railway.app/api/auth/login', {
            email: 'dgtalquantumleap@gmail.com',
            password: '65stfwgnwpnn'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Admin login successful');
        
        // Create invoice from the booking
        const invoiceResponse = await axios.post('https://fieldops-production-6b97.up.railway.app/api/invoices/create', {
            job_id: bookingResponse.data.data?.id || 1,
            customer_id: 1
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('✅ Invoice created successfully!');
        console.log('📄 Invoice Number:', invoiceResponse.data.data?.invoice_number);
        console.log('💰 Amount:', invoiceResponse.data.data?.amount);
        console.log('📧 Professional invoice email should be sent to: dgtalquantumleap@gmail.com\n');
        
        console.log('🎉 PROFESSIONAL EMAIL TEMPLATES TEST COMPLETE!');
        console.log('=' .repeat(50));
        console.log('✅ Check your email inbox at: dgtalquantumleap@gmail.com');
        console.log('📧 Look for:');
        console.log('   • Professional booking confirmation with modern design');
        console.log('   • Professional invoice with detailed layout');
        console.log('   • Mobile-responsive HTML templates');
        console.log('   • Professional gradients and CTAs');
        console.log('\n🌐 Production URL: https://fieldops-production-6b97.up.railway.app/admin');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testProfessionalEmails();
