const jwt = require('jsonwebtoken');
require('dotenv').config();

console.log('JWT_SECRET from env:', process.env.JWT_SECRET);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);

// Test token generation and verification
const token = jwt.sign(
    { id: 1, role: 'admin' },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
);

console.log('Generated token:', token);

// Test verification
try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('Token verified successfully:', decoded);
} catch (error) {
    console.log('Token verification failed:', error.message);
}

// Test with different secret
try {
    const decoded = jwt.verify(token, 'different-secret');
    console.log('Token verified with different secret:', decoded);
} catch (error) {
    console.log('Token verification failed with different secret:', error.message);
}
