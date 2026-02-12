const http = require('http');

// Use the correct field names for the /api/booking/book endpoint
const bookingData = {
    name: "Olumide Akinsola",
    phone: "5878372617", 
    email: "olumide@example.com",
    address: "Test Address",
    service: "Carpet Cleaning",
    date: "2026-01-27",
    time: "14:00",
    notes: "Test booking - recreating the missing olumide booking"
};

const postData = JSON.stringify(bookingData);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/booking/book',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('🧪 Testing CORRECT booking endpoint...');
console.log('Data:', JSON.stringify(bookingData, null, 2));

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response:', data);
        try {
            const response = JSON.parse(data);
            if (res.statusCode === 200 && response.success) {
                console.log('✅ Booking created successfully!');
                console.log(`📋 Job ID: ${response.jobId}`);
                console.log('🎯 This should now appear in the admin app');
            } else {
                console.log('❌ Booking failed:', response.error || data);
            }
        } catch (e) {
            console.log('❌ Invalid JSON response:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Request error:', e);
});

req.write(postData);
req.end();
