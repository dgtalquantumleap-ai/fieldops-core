const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { emitRealTimeUpdate, logActivity, triggerAutomations } = require('../utils/realtime');
const { validateBooking } = require('../middleware/validate');

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate phone number format
 * Accepts formats: 1234567890, 123-456-7890, (123) 456-7890, +1 123-456-7890
 */
function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone.trim());
}

/**
 * Validate email format
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate date is not in the past and not too far in future
 */
function validateBookingDate(dateString) {
  if (!dateString) {
    return { valid: false, error: 'Date is required' };
  }

  const bookingDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Can't book in the past
  if (bookingDate < today) {
    return { valid: false, error: 'Cannot book for past dates' };
  }
  
  // Can't book more than 90 days in advance
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 90);
  
  if (bookingDate > maxDate) {
    return { valid: false, error: 'Can only book up to 90 days in advance' };
  }
  
  return { valid: true };
}

/**
 * Validate time format HH:MM
 */
function validateTime(time) {
  if (!time || typeof time !== 'string') {
    return { valid: false, error: 'Time is required' };
  }
  
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  
  if (!timeRegex.test(time.trim())) {
    return { valid: false, error: 'Invalid time format. Use HH:MM (e.g., 09:00)' };
  }
  
  return { valid: true };
}

// ============================================
// PUBLIC BOOKING ENDPOINT
// ============================================

/**
 * POST /api/booking/book
 * Create a new booking (customer booking form)
 * 
 * Request body:
 * {
 *   name: string (required),
 *   phone: string (required),
 *   email: string (optional),
 *   address: string (required),
 *   service: string (required) - service name,
 *   date: string (required) - YYYY-MM-DD,
 *   time: string (required) - HH:MM,
 *   notes: string (optional)
 * }
 */
router.post('/book', validateBooking, async (req, res) => {
    try {
        const { name, phone, email, address, service, date, time, notes } = req.body;
        
        // ============================================
        // VALIDATION
        // ============================================
        
        // Validate required fields
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Name is required',
                code: 'MISSING_NAME',
                message: 'Please provide your name'
            });
        }
        
        if (!address || !address.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Address is required',
                code: 'MISSING_ADDRESS',
                message: 'Please provide your service address'
            });
        }
        
        if (!service || !service.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Service is required',
                code: 'MISSING_SERVICE',
                message: 'Please select a service'
            });
        }
        
        // Validate phone
        if (!validatePhone(phone)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number',
                code: 'INVALID_PHONE',
                message: 'Please provide a valid phone number'
            });
        }
        
        // Validate email if provided
        if (email && email.trim() && !validateEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format',
                code: 'INVALID_EMAIL',
                message: 'Please provide a valid email address'
            });
        }
        
        // Validate date
        const dateValidation = validateBookingDate(date);
        if (!dateValidation.valid) {
            return res.status(400).json({
                success: false,
                error: dateValidation.error,
                code: 'INVALID_DATE',
                message: dateValidation.error
            });
        }
        
        // Validate time
        const timeValidation = validateTime(time);
        if (!timeValidation.valid) {
            return res.status(400).json({
                success: false,
                error: timeValidation.error,
                code: 'INVALID_TIME',
                message: timeValidation.error
            });
        }
        
        // ============================================
        // CREATE OR FIND CUSTOMER
        // ============================================
        
        let customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone.trim());
        
        if (!customer) {
            console.log(`👤 Creating new customer: ${name} (${phone})`);
            
            // Note: customers table doesn't have created_at/updated_at columns in current schema
            const insertCustomer = db.prepare(
                'INSERT INTO customers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)'
            );
            
            const result = insertCustomer.run(
                name.trim(),
                phone.trim(),
                email ? email.trim() : null,
                address.trim(),
                'Online booking'
            );
            
            customer = { 
                id: result.lastInsertRowid,
                name: name.trim(),
                phone: phone.trim(),
                email: email ? email.trim() : null,
                address: address.trim()
            };
        } else {
            console.log(`👤 Found existing customer: ${customer.name}`);
        }
        
        // ============================================
        // FIND SERVICE BY ID (NOT NAME - MORE RELIABLE)
        // ============================================
        
        const serviceRecord = db.prepare('SELECT * FROM services WHERE name = ?').get(service.trim());
        
        if (!serviceRecord) {
            return res.status(400).json({
                success: false,
                error: 'Service not found',
                code: 'SERVICE_NOT_FOUND',
                message: `The service "${service}" is not available`
            });
        }

        // Ensure service is active
        if (!serviceRecord.is_active) {
            return res.status(400).json({
                success: false,
                error: 'Service unavailable',
                code: 'SERVICE_INACTIVE',
                message: `The service "${service}" is currently unavailable`
            });
        }
        
        // ============================================
        // CHECK FOR DUPLICATE BOOKING
        // ============================================
        
        const existingJob = db.prepare(
            'SELECT * FROM jobs WHERE customer_id = ? AND service_id = ? AND job_date = ? AND job_time = ? AND status NOT IN (?, ?)'
        ).get(customer.id, serviceRecord.id, date, time, 'Cancelled', 'cancelled');
        
        if (existingJob) {
            return res.status(409).json({
                success: false,
                error: 'Duplicate booking',
                code: 'DUPLICATE_BOOKING',
                message: 'You already have a booking for this service at this time'
            });
        }
        
        // ============================================
        // CREATE JOB WITH TIMESTAMPS
        // ============================================
        
        const now = new Date().toISOString();
        const insertJob = db.prepare(
            'INSERT INTO jobs (customer_id, service_id, job_date, job_time, location, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        
        const job = insertJob.run(
            customer.id,
            serviceRecord.id,
            date,
            time.trim(),  // Use provided time, don't default
            address.trim(),
            'Scheduled',  // ✓ CAPITALIZED - CRITICAL for admin dashboard filter
            notes ? notes.trim() : 'Online booking',
            now,
            now
        );
        
        console.log(`✅ Job created: ID ${job.lastInsertRowid} - ${name} - ${service} on ${date} at ${time}`);
        
        // ============================================
        // GET CREATED JOB DETAILS
        // ============================================
        
        const createdJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(job.lastInsertRowid);
        
        // ============================================
        // LOG & NOTIFY
        // ============================================
        
        // Log activity for audit trail
        try {
            logActivity(null, 'Customer', 'created', 'job', job.lastInsertRowid, `${name} - ${service}`);
        } catch (err) {
            console.warn('⚠️  Activity logging failed (non-critical):', err.message);
        }
        
        // Get io instance for real-time updates
        const io = req.app.get('io');
        
        // Send real-time update to admin dashboard - THIS IS CRITICAL FOR ADMIN VISIBILITY
        if (io) {
            try {
                emitRealTimeUpdate(io, 'new-booking', {
                    job: createdJob,
                    customer: customer
                }, 'admin');
                console.log('📡 Real-time update sent to admin');
            } catch (err) {
                console.warn('⚠️  Real-time update failed (non-critical):', err.message);
            }
        }
        
        // ============================================
        // SEND NOTIFICATIONS (Non-blocking)
        // ============================================
        
        (async () => {
            try {
                // Send confirmation email to customer
                if (email && email.trim()) {
                    try {
                        const { sendBookingConfirmation } = require('../utils/emailTemplates');
                        
                        await sendBookingConfirmation({
                            customer_name: name.trim(),
                            email: email.trim(),
                            service_name: service,
                            job_date: date,
                            job_time: time,
                            address: address.trim(),
                            job_id: job.lastInsertRowid,
                            support_link: process.env.APP_URL || 'https://fieldops-production-6b97.up.railway.app',
                            company_name: process.env.COMPANY_NAME || 'Stilt Heights',
                            company_phone: process.env.COMPANY_PHONE || '(555) 123-4567',
                            company_email: process.env.COMPANY_EMAIL || 'info@stiltheights.com',
                            company_website: process.env.COMPANY_WEBSITE || 'www.stiltheights.com'
                        });
                        
                        console.log('✉️  Booking confirmation email sent to:', email.trim());
                    } catch (emailError) {
                        console.error('❌ Failed to send booking confirmation email:', emailError.message);
                        // Don't throw - email failure shouldn't break the booking
                    }
                }
                
                // Send notifications module alert if available
                try {
                    const notifications = require('../utils/notifications');
                    
                    const bookingData = {
                        name: name.trim(),
                        email: email ? email.trim() : null,
                        phone: phone.trim(),
                        service: service,
                        date: date,
                        time: time,
                        address: address.trim(),
                        notes: notes ? notes.trim() : null,
                        job_id: job.lastInsertRowid
                    };
                    
                    await notifications.sendAdminNotification(bookingData);
                    console.log('📢 Admin notification sent');
                } catch (notifError) {
                    console.warn('⚠️  Admin notification failed (non-critical):', notifError.message);
                }
                
                // Trigger automations if available
                try {
                    const bookingData = {
                        name: name.trim(),
                        email: email ? email.trim() : null,
                        phone: phone.trim(),
                        service: service,
                        date: date,
                        time: time,
                        address: address.trim(),
                        notes: notes ? notes.trim() : null,
                        job_id: job.lastInsertRowid
                    };
                    
                    await triggerAutomations('Customer Booking', bookingData, io);
                    console.log('⚙️  Automations triggered');
                } catch (autoError) {
                    console.warn('⚠️  Automation trigger failed (non-critical):', autoError.message);
                }
                
            } catch (error) {
                console.error('❌ Error in notification chain:', error);
                // Don't throw - notifications are non-critical
            }
        })().catch(err => console.error('Async notification error:', err));
        
        // ============================================
        // RESPONSE
        // ============================================
        
        res.status(201).json({
            success: true,
            message: 'Booking confirmed! Check your email for details.',
            data: {
                jobId: job.lastInsertRowid,
                bookingDate: date,
                bookingTime: time,
                service: service,
                customerPhone: phone.trim()
            }
        });
        
    } catch (error) {
        console.error('❌ Booking error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create booking',
            code: 'BOOKING_ERROR',
            message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while processing your booking'
        });
    }
});

// ============================================
// GET AVAILABLE SERVICES
// ============================================

/**
 * GET /api/booking/services
 * Get list of available services for booking form
 */
router.get('/services', async (req, res) => {
    try {
        const services = db.prepare(
            'SELECT id, name, price, description FROM services WHERE is_active = 1 ORDER BY name'
        ).all();
        
        if (!services || services.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No services available'
            });
        }
        
        res.status(200).json({
            success: true,
            data: services,
            count: services.length
        });
    } catch (error) {
        console.error('❌ Error fetching services:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch services',
            code: 'SERVICES_ERROR',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Could not load available services'
        });
    }
});

module.exports = router;
