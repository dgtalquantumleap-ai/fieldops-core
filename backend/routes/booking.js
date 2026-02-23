const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { triggerAutomations } = require('../utils/realtime');
const { validateBooking } = require('../middleware/validate');
const notifications = require('../utils/notifications');

function validatePhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    return /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(phone.trim());
}
function validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
function validateBookingDate(dateString) {
    if (!dateString) return { valid: false, error: 'Date is required' };
    const bookingDate = new Date(dateString);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (bookingDate < today) return { valid: false, error: 'Cannot book for past dates' };
    const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 90);
    if (bookingDate > maxDate) return { valid: false, error: 'Can only book up to 90 days in advance' };
    return { valid: true };
}
function validateTime(time) {
    if (!time || typeof time !== 'string') return { valid: false, error: 'Time is required' };
    if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time.trim())) return { valid: false, error: 'Invalid time format. Use HH:MM' };
    return { valid: true };
}

router.post('/book', validateBooking, async (req, res) => {
    try {
        const { name, phone, email, address, service, date, time, notes } = req.body;

        if (!name?.trim())    return res.status(400).json({ success: false, error: 'Name is required',    code: 'MISSING_NAME' });
        if (!address?.trim()) return res.status(400).json({ success: false, error: 'Address is required', code: 'MISSING_ADDRESS' });
        if (!service?.trim()) return res.status(400).json({ success: false, error: 'Service is required', code: 'MISSING_SERVICE' });
        if (!validatePhone(phone)) return res.status(400).json({ success: false, error: 'Invalid phone number', code: 'INVALID_PHONE' });
        if (email?.trim() && !validateEmail(email)) return res.status(400).json({ success: false, error: 'Invalid email format', code: 'INVALID_EMAIL' });
        const dateVal = validateBookingDate(date);
        if (!dateVal.valid) return res.status(400).json({ success: false, error: dateVal.error, code: 'INVALID_DATE' });
        const timeVal = validateTime(time);
        if (!timeVal.valid) return res.status(400).json({ success: false, error: timeVal.error, code: 'INVALID_TIME' });

        // Create or find customer
        let customer = (await db.query('SELECT * FROM customers WHERE phone = $1', [phone.trim()])).rows[0];
        if (!customer) {
            customer = (await db.query(
                'INSERT INTO customers (name, phone, email, address, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [name.trim(), phone.trim(), email ? email.trim() : null, address.trim(), 'Online booking']
            )).rows[0];
        }

        const serviceRecord = (await db.query('SELECT * FROM services WHERE name = $1', [service.trim()])).rows[0];
        if (!serviceRecord)        return res.status(400).json({ success: false, error: 'Service not found',    code: 'SERVICE_NOT_FOUND' });
        if (!serviceRecord.is_active) return res.status(400).json({ success: false, error: 'Service unavailable', code: 'SERVICE_INACTIVE' });

        const duplicate = (await db.query(
            "SELECT id FROM jobs WHERE customer_id=$1 AND service_id=$2 AND job_date=$3 AND job_time=$4 AND status NOT IN ('Cancelled','cancelled')",
            [customer.id, serviceRecord.id, date, time]
        )).rows[0];
        if (duplicate) return res.status(409).json({ success: false, error: 'Duplicate booking', code: 'DUPLICATE_BOOKING' });

        // Find least-loaded available staff
        const assignedStaff = (await db.query(`
            SELECT u.id, u.name, u.email, u.phone, COUNT(j2.id) AS week_jobs
            FROM users u
            LEFT JOIN jobs j2 ON u.id = j2.assigned_to
                AND j2.job_date >= (NOW() - INTERVAL '7 days')::DATE::TEXT
                AND j2.status NOT IN ('Cancelled','completed')
                AND j2.deleted_at IS NULL
            WHERE u.is_active = 1
              AND u.role IN ('staff','admin','owner')
              AND u.id NOT IN (
                  SELECT assigned_to FROM jobs
                  WHERE job_date=$1 AND job_time=$2
                    AND status NOT IN ('Cancelled','completed')
                    AND deleted_at IS NULL AND assigned_to IS NOT NULL
              )
            GROUP BY u.id ORDER BY week_jobs ASC LIMIT 1
        `, [date, time])).rows[0];

        if (!assignedStaff) return res.status(409).json({ success: false, error: 'No staff available for this time slot', code: 'NO_STAFF_AVAILABLE' });

        const now = new Date().toISOString();
        const jobResult = await db.query(`
            INSERT INTO jobs (customer_id,service_id,assigned_to,job_date,job_time,location,status,notes,estimated_duration,created_at,updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,'Scheduled',$7,$8,$9,$10) RETURNING id
        `, [customer.id, serviceRecord.id, assignedStaff.id, date, time, address.trim(), notes?.trim() || '', serviceRecord.duration || 2, now, now]);

        const jobId = jobResult.rows[0].id;
        console.log(`🎉 Job #${jobId} created — ${customer.name} → ${assignedStaff.name}`);

        const automationData = { customer_id: customer.id, customer_name: customer.name, customer_email: customer.email, customer_phone: customer.phone, service, date, time, address: address.trim(), staff_name: assignedStaff.name || 'Our Team', job_id: jobId, notes: notes?.trim() || '' };

        if (customer.email) {
            notifications.sendCustomerConfirmation({ name: customer.name, email: customer.email, service, date, time, address: address.trim() })
                .catch(e => console.warn('⚠️ Customer email failed:', e.message));
        }
        notifications.sendAdminNotification({ name: customer.name, email: customer.email || 'N/A', phone: customer.phone, service, date, time, address: address.trim(), notes: notes?.trim() || '' })
            .catch(e => console.warn('⚠️ Admin email failed:', e.message));
        if (assignedStaff.email) {
            notifications.sendEmail({ to: assignedStaff.email, subject: `New Job Assignment — ${service}`, html: `<h3>New Job Assigned to You</h3><p><strong>Customer:</strong> ${customer.name} (${customer.phone})</p><p><strong>Service:</strong> ${service}</p><p><strong>Date:</strong> ${date} at ${time}</p><p><strong>Location:</strong> ${address.trim()}</p><p><strong>Job Ref:</strong> JOB-${String(jobId).padStart(4,'0')}</p>` })
                .catch(e => console.warn('⚠️ Staff email failed:', e.message));
        }
        try {
            const push = require('../utils/pushNotifications');
            push.notifyJobAssigned(assignedStaff.id, { jobId, service, customerName: customer.name, date, time }).catch(() => {});
        } catch (_) {}
        triggerAutomations('Booking Confirmed', automationData).catch(e => console.warn('⚠️ Automation error:', e.message));

        res.status(201).json({ success: true, message: 'Booking confirmed! Job scheduled with optimal staff assignment.', data: { jobId, jobDate: date, jobTime: time, service, customerPhone: phone.trim(), assignedStaff } });
    } catch (error) {
        console.error('❌ Booking error:', error);
        res.status(500).json({ success: false, error: 'Failed to create booking', code: 'BOOKING_ERROR', message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while processing your booking' });
    }
});

router.get('/services', async (_req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, price, description FROM services WHERE is_active = 1 ORDER BY name');
        res.status(200).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
        console.error('❌ Error fetching services:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch services', code: 'SERVICES_ERROR' });
    }
});

router.get('/status/:ref', async (req, res) => {
    try {
        const ref = req.params.ref.trim().toUpperCase();
        const match = ref.match(/^JOB-(\d+)$/);
        if (!match) return res.status(400).json({ success: false, error: 'Invalid reference format. Use JOB-XXXX' });

        const jobId = parseInt(match[1], 10);
        const { rows } = await db.query(`
            SELECT j.id, j.status, j.job_date, j.job_time, j.location,
                   s.name AS service_name, u.name AS staff_name
            FROM jobs j
            LEFT JOIN services s ON j.service_id = s.id
            LEFT JOIN users u ON j.assigned_to = u.id
            WHERE j.id = $1 AND j.deleted_at IS NULL
        `, [jobId]);

        if (!rows[0]) return res.status(404).json({ success: false, error: 'No booking found with that reference number' });
        const job = rows[0];
        const staffFirstName = job.staff_name ? job.staff_name.split(' ')[0] : 'Pending Assignment';
        res.json({ success: true, data: { reference: `JOB-${String(job.id).padStart(4,'0')}`, status: job.status, service: job.service_name, date: job.job_date, time: job.job_time, assignedStaff: staffFirstName } });
    } catch (error) {
        console.error('Booking status lookup error:', error);
        res.status(500).json({ success: false, error: 'Failed to look up booking' });
    }
});

module.exports = router;
