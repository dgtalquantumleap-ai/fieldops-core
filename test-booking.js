const testBooking = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/booking/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Customer',
                phone: '555-123-4567',
                email: 'test@example.com',
                address: '123 Test St',
                service: 'Standard Cleaning',
                date: '2026-02-18',
                time: '10:00',
                notes: 'Test booking'
            })
        });
        
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error);
    }
};

testBooking();
