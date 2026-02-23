const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { emitRealTimeUpdate, logActivity, triggerAutomations } = require('../utils/realtime');
const { validateBooking } = require('../middleware/validate');

async function validateTimeSlot(date, time) {
    const conflictingJobs = (await db.query(`
        SELECT id FROM jobs
        WHERE job_date = $1 AND job_time = $2 AND status NOT IN ('Cancelled','completed')
    `, [date, time])).rows;
    if (conflictingJobs.length > 0) {
        return { available: false, conflicts: conflictingJobs.map(j => ({ jobId: j.id, time })) };
    }
    return { available: true };
}

async function checkStaffAvailability(staffId, date, time) {
    const staffJobs = (await db.query(`
        SELECT id FROM jobs
        WHERE assigned_to = $1 AND job_date = $2 AND job_time = $3 AND status NOT IN ('Cancelled','completed')
    `, [staffId, date, time])).rows;
    return { available: staffJobs.length === 0, existingJobs: staffJobs };
}

async function getOptimalStaffAssignment(serviceId, date, time) {
    const activeStaff = (await db.query(`
        SELECT u.id, u.name, u.email, u.phone, u.role, COUNT(j.id) as current_jobs
        FROM users u
        LEFT JOIN jobs j ON u.id = j.assigned_to
            AND j.job_date >= (NOW() - INTERVAL '7 days')::DATE::TEXT
            AND j.status NOT IN ('Cancelled','completed')
        WHERE u.is_active = 1 AND u.role IN ('staff','admin','owner')
        GROUP BY u.id ORDER BY current_jobs ASC
    `)).rows;

    if (activeStaff.length === 0) return { error: 'No active staff available' };

    const service = (await db.query('SELECT * FROM services WHERE id = $1', [serviceId])).rows[0];
    if (!service) throw new Error('Service not found');

    const available = [];
    for (const staff of activeStaff) {
        const avail = await checkStaffAvailability(staff.id, date, time);
        if (avail.available) available.push(staff);
    }

    if (available.length === 0) return { error: 'No staff available for this time slot', alternatives: activeStaff.map(s => s.name) };
    return { recommended: available[0], alternatives: available.slice(1), totalAvailable: available.length };
}

router.post('/validate', validateBooking, async (req, res) => {
    try {
        const { service, date, time } = req.body;

        const timeSlotValidation = await validateTimeSlot(date, time);
        if (!timeSlotValidation.available) {
            return res.status(409).json({ success: false, error: 'Time slot not available', code: 'TIME_SLOT_UNAVAILABLE', details: timeSlotValidation.conflicts || [] });
        }

        const serviceRecord = (await db.query('SELECT * FROM services WHERE name = $1 AND is_active = 1', [service])).rows[0];
        if (!serviceRecord) return res.status(400).json({ success: false, error: 'Service not available', code: 'SERVICE_UNAVAILABLE' });

        const staffAssignment = await getOptimalStaffAssignment(serviceRecord.id, date, time);
        if (staffAssignment.error) return res.status(staffAssignment.recommended === undefined ? 409 : 500).json({ success: false, error: staffAssignment.error, code: 'STAFF_ASSIGNMENT_ERROR' });

        const [staffCount, concurrentJobs] = await Promise.all([
            db.query('SELECT COUNT(*) as count FROM users WHERE is_active = 1'),
            db.query("SELECT COUNT(*) as count FROM jobs WHERE job_date = $1 AND status IN ('Scheduled','In Progress')", [date]),
        ]);

        const totalStaff = parseInt(staffCount.rows[0].count) || 1;
        const capacityUtilization = (parseInt(concurrentJobs.rows[0].count) / totalStaff) * 100;

        if (capacityUtilization > 90) {
            return res.status(409).json({ success: false, error: 'High capacity utilization', code: 'CAPACITY_FULL', utilization: capacityUtilization });
        }

        res.status(200).json({
            success: true,
            message: 'Time slot available for booking',
            data: {
                valid: true,
                timeSlot: timeSlotValidation,
                service: serviceRecord,
                recommendedStaff: staffAssignment.recommended,
                alternatives: staffAssignment.alternatives,
                capacity: { utilization: capacityUtilization, available: totalStaff - parseInt(concurrentJobs.rows[0].count) },
                estimatedDuration: serviceRecord.duration || 2,
                pricing: serviceRecord.price
            }
        });
    } catch (error) {
        console.error('❌ Scheduling validation error:', error);
        res.status(500).json({ success: false, error: 'Scheduling validation failed', code: 'SCHEDULING_ERROR', message: error.message });
    }
});

router.get('/staff-availability', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ success: false, error: 'Date is required' });

        const activeStaff = (await db.query(`
            SELECT u.id, u.name, u.email, u.phone, u.role, j.id as current_job_id
            FROM users u
            LEFT JOIN jobs j ON u.id = j.assigned_to
                AND j.job_date = $1 AND j.status IN ('Scheduled','In Progress')
            WHERE u.is_active = 1 AND u.role IN ('staff','admin','owner')
            ORDER BY u.name
        `, [date])).rows;

        const staffWithAvailability = await Promise.all(activeStaff.map(async staff => {
            const avail = await checkStaffAvailability(staff.id, date, '09:00');
            return { ...staff, available: avail.available, currentJob: staff.current_job_id, existingJobs: avail.existingJobs || [] };
        }));

        res.json({ success: true, data: staffWithAvailability });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/confirm-booking', async (req, res) => {
    try {
        const { customer_id, service_id, date, time, address, notes, staff_id, estimated_duration } = req.body;

        const customer = (await db.query('SELECT * FROM customers WHERE id = $1', [customer_id])).rows[0];
        if (!customer) return res.status(400).json({ success: false, error: 'Customer not found' });

        const service = (await db.query('SELECT * FROM services WHERE id = $1', [service_id])).rows[0];
        if (!service) return res.status(400).json({ success: false, error: 'Service not found' });

        const staff = (await db.query("SELECT * FROM users WHERE id = $1 AND is_active = 1 AND role IN ('staff','admin','owner')", [staff_id])).rows[0];
        if (!staff) return res.status(400).json({ success: false, error: 'Staff member not available' });

        const staffAvailability = await checkStaffAvailability(staff_id, date, time);
        if (!staffAvailability.available) return res.status(409).json({ success: false, error: 'Staff member is no longer available for this time slot' });

        const now = new Date().toISOString();
        const jobResult = await db.query(`
            INSERT INTO jobs (customer_id, service_id, assigned_to, job_date, job_time, location, status, notes, estimated_duration, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'Scheduled', $7, $8, $9, $10)
            RETURNING id
        `, [customer_id, service_id, staff_id, date, time, address, notes || '', estimated_duration || service.duration || 2, now, now]);

        const jobId = jobResult.rows[0].id;

        try {
            const createdJob = (await db.query('SELECT * FROM jobs WHERE id = $1', [jobId])).rows[0];
            logActivity(staff_id, staff.name, 'created', 'job', jobId, `Assigned job: ${service.name}`);
            const io = req.app.get('io');
            if (io) {
                emitRealTimeUpdate(io, 'job-scheduled', { job: createdJob, customer, staff, scheduledBy: 'scheduling-system' }, 'admin');
                emitRealTimeUpdate(io, 'job-assigned', { job: createdJob, customer }, 'staff');
            }
            const automationData = { customer_name: customer.name, customer_email: customer.email, customer_phone: customer.phone, service: service.name, date, time, address, staff_name: staff.name, job_id: jobId };
            await triggerAutomations('Job Scheduled', automationData, io);

            try {
                const push = require('../utils/pushNotifications');
                await push.notifyJobAssigned(staff_id, { jobId, service: service.name, customerName: customer.name, date, time });
            } catch (_) {}
        } catch (e) {
            console.warn('⚠️ Automation/real-time failed (non-critical):', e.message);
        }

        res.status(201).json({ success: true, message: 'Job scheduled successfully', data: { jobId, jobDate: date, jobTime: time, staff, customer } });
    } catch (error) {
        console.error('❌ Booking confirmation error:', error);
        res.status(500).json({ success: false, error: 'Failed to confirm booking', message: error.message });
    }
});

router.get('/time-slots', async (req, res) => {
    try {
        const { date, service_id } = req.query;
        if (!date) return res.status(400).json({ success: false, error: 'Date is required' });

        const service = service_id ? (await db.query('SELECT * FROM services WHERE id = $1', [service_id])).rows[0] : null;
        const duration = service ? service.duration || 2 : 2;

        const timeSlots = [];
        for (let hour = 9; hour <= 18; hour += 2) {
            const time = `${String(hour).padStart(2, '0')}:00`;
            const validation = await validateTimeSlot(date, time);
            timeSlots.push({ time, available: validation.available, conflicts: validation.conflicts || [] });
        }

        res.json({ success: true, data: { date, serviceDuration: duration, timeSlots } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
