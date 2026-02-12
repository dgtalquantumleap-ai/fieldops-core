const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { emitRealTimeUpdate, logActivity, triggerAutomations } = require('../utils/realtime');
const { validateBooking } = require('../middleware/validate');

// Public booking endpoint (no auth required)
router.post('/book', validateBooking, async (req, res) => {
    try {
        const { name, phone, email, address, service, date, time, notes } = req.body;
        
        // Create or find customer
        let customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
        
        if (!customer) {
            const insertCustomer = db.prepare(
                'INSERT INTO customers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)'
            );
            const result = insertCustomer.run(name, phone, email, address, 'Online booking');
            customer = { id: result.lastInsertRowid };
        }
        
        // Find service
        const serviceRecord = db.prepare('SELECT * FROM services WHERE name = ?').get(service);
        
        if (!serviceRecord) {
            return res.status(400).json({ error: 'Service not found' });
        }
        
        // Create job
        const insertJob = db.prepare(
            'INSERT INTO jobs (customer_id, service_id, job_date, job_time, location, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        
        const job = insertJob.run(
            customer.id,
            serviceRecord.id,
            date,
            time || '09:00',
            address,
            'scheduled',
            notes || 'Online booking'
        );
        
        // Get created job details
        const createdJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(job.lastInsertRowid);
        
        // Log booking
        console.log(`📅 New booking: ${name} - ${service} on ${date}`);
        
        // Log activity
        logActivity(null, 'Customer', 'created', 'job', job.lastInsertRowid, `${name} - ${service}`);
        
        // Get io instance for real-time updates
        const io = req.app.get('io');
        
        // Send real-time update to admin dashboard
        emitRealTimeUpdate(io, 'new-booking', {
            job: createdJob,
            customer: customer
        }, 'admin');
        
        // Send notifications (if configured)
        try {
            const notifications = require('../utils/notifications');
            const bookingData = { 
                name,
                email,
                phone, 
                service, 
                date, 
                time, 
                address, 
                notes,
                job_id: job.lastInsertRowid
            };
            
            // Send confirmation to customer
            if (email) {
                await notifications.sendCustomerConfirmation(bookingData);
            }
            
            // Notify admin
            await notifications.sendAdminNotification(bookingData);
            
            // Trigger automations
            await triggerAutomations('Customer Booking', bookingData, io);
            
        } catch (notifError) {
            console.log('Notification error (non-critical):', notifError);
        }
        
        res.json({ 
            success: true, 
            message: 'Booking confirmed! Check your email for details.',
            jobId: job.lastInsertRowid 
        });
        
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// Get available services for booking form
router.get('/services', async (req, res) => {
    try {
        const services = db.prepare('SELECT name, price, description FROM services').all();
        res.json(services);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;