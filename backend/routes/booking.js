const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { emitRealTimeUpdate, logActivity, triggerAutomations } = require('../utils/realtime');
const { validateBooking } = require('../middleware/validate');
const aiAutomation = require('../utils/aiAutomation');
const notifications = require('../utils/notifications');

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
        // FIND AVAILABLE STAFF (direct DB — no self-HTTP)
        // ============================================

        console.log('📋 Finding available staff for', date, time);

        // Pick the least-loaded staff member who has no conflict at this exact slot
        const assignedStaff = db.prepare(`
            SELECT u.id, u.name, u.email, u.phone,
                   COUNT(j2.id) AS week_jobs
            FROM users u
            LEFT JOIN jobs j2 ON u.id = j2.assigned_to
                AND j2.job_date >= date('now', '-7 days')
                AND j2.status NOT IN ('Cancelled', 'completed')
                AND j2.deleted_at IS NULL
            WHERE u.is_active = 1
              AND u.role IN ('staff', 'admin', 'owner')
              AND u.id NOT IN (
                  SELECT assigned_to FROM jobs
                  WHERE job_date = ? AND job_time = ?
                    AND status NOT IN ('Cancelled', 'completed')
                    AND deleted_at IS NULL
                    AND assigned_to IS NOT NULL
              )
            GROUP BY u.id
            ORDER BY week_jobs ASC
            LIMIT 1
        `).get(date, time);

        if (!assignedStaff) {
            return res.status(409).json({
                success: false,
                error: 'No staff available for this time slot',
                code: 'NO_STAFF_AVAILABLE',
                message: 'All staff are busy at the selected time. Please choose a different time window.'
            });
        }

        console.log(`👷 Assigning to: ${assignedStaff.name}`);

        // ============================================
        // CREATE JOB
        // ============================================

        const now = new Date().toISOString();
        const jobResult = db.prepare(`
            INSERT INTO jobs (
                customer_id, service_id, assigned_to,
                job_date, job_time, location, status, notes,
                estimated_duration, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'Scheduled', ?, ?, ?, ?)
        `).run(
            customer.id, serviceRecord.id, assignedStaff.id,
            date, time, address.trim(),
            notes ? notes.trim() : '',
            serviceRecord.duration || 2,
            now, now
        );

        const jobId = jobResult.lastInsertRowid;
        console.log(`🎉 Job #${jobId} created — ${customer.name} → ${assignedStaff.name}`);

        // ============================================
        // AUTOMATIONS (non-critical)
        // ============================================

        try {
            const automationData = {
                customer_id: customer.id,
                customer_name: customer.name,
                customer_email: customer.email,
                customer_phone: customer.phone,
                service: service,
                date: date,
                time: time,
                address: address.trim(),
                staff_name: assignedStaff.name || 'Our Team',
                job_id: jobId,
                notes: notes ? notes.trim() : ''
            };

            // AI confirmation email to customer
            if (customer.email) {
                try {
                    const aiEmail = await aiAutomation.generateBookingEmail({
                        name: customer.name,
                        email: customer.email,
                        service: service,
                        date: date,
                        time: time,
                        address: address.trim()
                    });
                    await notifications.sendEmail({
                        to: customer.email,
                        subject: `Booking Confirmed — Stilt Heights`,
                        body: aiEmail
                    });
                    console.log('📧 Confirmation email sent to customer');
                } catch (aiError) {
                    console.warn('⚠️ AI email failed (non-critical)');
                }
            }

            // AI notification to assigned staff
            if (assignedStaff.email) {
                try {
                    const aiStaffMsg = await aiAutomation.generateJobAssignmentMessage({
                        customer_name: customer.name,
                        service_name: service,
                        job_date: date,
                        job_time: time,
                        location: address.trim()
                    });
                    await notifications.sendEmail({
                        to: assignedStaff.email,
                        subject: `New Job Assignment — ${service}`,
                        body: aiStaffMsg
                    });
                    console.log('📨 Assignment email sent to staff');
                } catch (aiError) {
                    console.warn('⚠️ AI staff notification failed (non-critical)');
                }
            }

            // Push notification to assigned staff
            try {
                const push = require('../utils/pushNotifications');
                await push.notifyJobAssigned(assignedStaff.id, {
                    jobId, service: service,
                    customerName: customer.name, date, time
                });
            } catch (pushError) {
                console.warn('⚠️ Push notification failed (non-critical)');
            }

            await triggerAutomations('Booking Confirmed', automationData);
            console.log('⚙️ Automations triggered');

        } catch (automationError) {
            console.warn('⚠️ Automation error (non-critical):', automationError.message);
        }

        // ============================================
        // RESPONSE
        // ============================================

        res.status(201).json({
            success: true,
            message: 'Booking confirmed! Job scheduled with optimal staff assignment.',
            data: {
                jobId: jobId,
                jobDate: date,
                jobTime: time,
                service: service,
                customerPhone: phone.trim(),
                assignedStaff: assignedStaff
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

// ============================================
// BOOKING STATUS LOOKUP (PUBLIC)
// ============================================

/**
 * GET /api/booking/status/:ref
 * Let customers check their booking status by job reference (e.g. JOB-0001)
 * Returns only safe public fields — no customer PII exposed
 */
router.get('/status/:ref', (req, res) => {
    try {
        const ref = req.params.ref.trim().toUpperCase();
        const match = ref.match(/^JOB-(\d+)$/);
        if (!match) {
            return res.status(400).json({
                success: false,
                error: 'Invalid reference format. Use JOB-XXXX (e.g. JOB-0001)'
            });
        }

        const jobId = parseInt(match[1], 10);
        const job = db.prepare(`
            SELECT j.id, j.status, j.job_date, j.job_time, j.location,
                   s.name AS service_name,
                   u.name AS staff_name
            FROM jobs j
            LEFT JOIN services s ON j.service_id = s.id
            LEFT JOIN users   u ON j.assigned_to = u.id
            WHERE j.id = ? AND j.deleted_at IS NULL
        `).get(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'No booking found with that reference number'
            });
        }

        // Only return the staff member's first name for privacy
        const staffFirstName = job.staff_name
            ? job.staff_name.split(' ')[0]
            : 'Pending Assignment';

        res.json({
            success: true,
            data: {
                reference: `JOB-${String(job.id).padStart(4, '0')}`,
                status: job.status,
                service: job.service_name,
                date: job.job_date,
                time: job.job_time,
                assignedStaff: staffFirstName
            }
        });
    } catch (error) {
        console.error('Booking status lookup error:', error);
        res.status(500).json({ success: false, error: 'Failed to look up booking' });
    }
});

module.exports = router;
