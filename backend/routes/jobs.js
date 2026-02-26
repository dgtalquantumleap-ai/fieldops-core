const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { log } = require('../middleware/logging');
const { paginate, handleDbError } = require('../utils/dbHelper');
const { validateJob } = require('../middleware/validate');

const JOB_SELECT = `
    SELECT j.*,
           c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
           u.name as staff_name, u.email as staff_email,
           s.name as service_name, s.price as service_price, s.description as service_description
    FROM jobs j
    LEFT JOIN customers c ON j.customer_id = c.id
    LEFT JOIN users u ON j.assigned_to = u.id
    LEFT JOIN services s ON j.service_id = s.id
`;

router.get('/', async (req, res) => {
    try {
        const { page, limit } = req.query;
        const result = await paginate(
            `${JOB_SELECT} WHERE j.deleted_at IS NULL ORDER BY j.created_at DESC`,
            'SELECT COUNT(*) as count FROM jobs WHERE deleted_at IS NULL',
            page, limit
        );
        if (!result.success) return res.status(result.status || 500).json(result);
        log.success(req.id, `Fetched ${result.data.length} jobs`);
        res.json(result);
    } catch (error) {
        log.error(req.id, 'Unexpected error fetching jobs', error);
        res.status(500).json({ success: false, error: 'Failed to fetch jobs', code: 'FETCH_ERROR' });
    }
});

router.post('/', validateJob, async (req, res) => {
    try {
        const { customer_id, service_id, assigned_to, job_date, job_time, location, notes, recurrence_rule, recurrence_end_date } = req.body;

        const [custRow, svcRow] = await Promise.all([
            db.query('SELECT id FROM customers WHERE id = $1 AND deleted_at IS NULL', [customer_id]),
            db.query('SELECT id FROM services WHERE id = $1 AND is_active = 1', [service_id]),
        ]);
        if (!custRow.rows[0]) return res.status(400).json({ success: false, error: 'Customer not found', code: 'CUSTOMER_NOT_FOUND' });
        if (!svcRow.rows[0])  return res.status(400).json({ success: false, error: 'Service not found', code: 'SERVICE_NOT_FOUND' });

        if (assigned_to) {
            const staffRow = await db.query('SELECT id FROM users WHERE id = $1 AND is_active = 1', [assigned_to]);
            if (!staffRow.rows[0]) return res.status(400).json({ success: false, error: 'Staff member not found', code: 'STAFF_NOT_FOUND' });
        }

        const validRecurrence = ['weekly', 'biweekly', 'monthly', 'quarterly'];
        const ruleToSave = recurrence_rule && validRecurrence.includes(recurrence_rule) ? recurrence_rule : null;

        const insertResult = await db.query(`
            INSERT INTO jobs (customer_id, service_id, assigned_to, job_date, job_time, location, notes, status, recurrence_rule, recurrence_end_date, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'Scheduled', $8, $9, NOW(), NOW())
            RETURNING id
        `, [customer_id, service_id, assigned_to || null, job_date, job_time, location, notes, ruleToSave, recurrence_end_date || null]);

        const newJob = (await db.query(`${JOB_SELECT} WHERE j.id = $1`, [insertResult.rows[0].id])).rows[0];

        log.success(req.id, 'Job created', { jobId: newJob.id });
        res.status(201).json({ success: true, data: newJob, message: 'Job created successfully' });
    } catch (error) {
        log.error(req.id, 'Job creation error', error);
        res.status(500).json({ success: false, error: 'Failed to create job', code: 'CREATE_ERROR' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { rows } = await db.query(`${JOB_SELECT} WHERE j.id = $1 AND j.deleted_at IS NULL`, [req.params.id]);
        if (!rows[0]) return res.status(404).json({ success: false, error: 'Job not found', code: 'NOT_FOUND' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        log.error(req.id, 'Error fetching job', error);
        res.status(500).json({ success: false, error: 'Failed to fetch job', code: 'FETCH_ERROR' });
    }
});

router.patch('/:id', validateJob, async (req, res) => {
    try {
        const jobId = req.params.id;
        const { customer_id, service_id, assigned_to, job_date, job_time, location, notes, status } = req.body;

        const existing = (await db.query('SELECT id FROM jobs WHERE id = $1 AND deleted_at IS NULL', [jobId])).rows[0];
        if (!existing) return res.status(404).json({ success: false, error: 'Job not found', code: 'NOT_FOUND' });

        const updates = [];
        const values = [];
        let idx = 1;

        if (customer_id !== undefined) {
            const c = (await db.query('SELECT id FROM customers WHERE id = $1 AND deleted_at IS NULL', [customer_id])).rows[0];
            if (!c) return res.status(400).json({ success: false, error: 'Customer not found', code: 'CUSTOMER_NOT_FOUND' });
            updates.push(`customer_id = $${idx++}`); values.push(customer_id);
        }
        if (service_id !== undefined) {
            const s = (await db.query('SELECT id FROM services WHERE id = $1 AND is_active = 1', [service_id])).rows[0];
            if (!s) return res.status(400).json({ success: false, error: 'Service not found', code: 'SERVICE_NOT_FOUND' });
            updates.push(`service_id = $${idx++}`); values.push(service_id);
        }
        if (assigned_to !== undefined) {
            if (assigned_to !== null) {
                const st = (await db.query('SELECT id FROM users WHERE id = $1 AND is_active = 1', [assigned_to])).rows[0];
                if (!st) return res.status(400).json({ success: false, error: 'Staff member not found', code: 'STAFF_NOT_FOUND' });
            }
            updates.push(`assigned_to = $${idx++}`); values.push(assigned_to);
        }
        if (job_date  !== undefined) { updates.push(`job_date = $${idx++}`);  values.push(job_date); }
        if (job_time  !== undefined) { updates.push(`job_time = $${idx++}`);  values.push(job_time); }
        if (location  !== undefined) { updates.push(`location = $${idx++}`);  values.push(location); }
        if (notes     !== undefined) { updates.push(`notes = $${idx++}`);     values.push(notes); }
        if (status    !== undefined) {
            const valid = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];
            if (!valid.includes(status)) return res.status(400).json({ success: false, error: 'Invalid job status', code: 'INVALID_STATUS', validStatuses: valid });
            updates.push(`status = $${idx++}`); values.push(status);
        }

        if (updates.length === 0) return res.status(400).json({ success: false, error: 'No fields to update', code: 'NO_UPDATES' });

        updates.push(`updated_at = NOW()`);
        values.push(jobId);

        await db.query(`UPDATE jobs SET ${updates.join(', ')} WHERE id = $${idx}`, values);
        const updatedJob = (await db.query(`${JOB_SELECT} WHERE j.id = $1`, [jobId])).rows[0];

        if (updatedJob?.assigned_to) {
            try {
                const push = require('../utils/pushNotifications');
                if (assigned_to !== undefined) {
                    await push.notifyJobAssigned(updatedJob.assigned_to, { jobId, service: updatedJob.service_name || 'Service', customerName: updatedJob.customer_name || 'Customer', date: updatedJob.job_date, time: updatedJob.job_time });
                } else if (status !== undefined) {
                    await push.notifyJobUpdated(updatedJob.assigned_to, { jobId, service: updatedJob.service_name || 'Service', status: updatedJob.status });
                }
            } catch (pushError) {
                log.warn(req.id, 'Push notification failed (non-critical)', pushError.message);
            }
        }

        log.success(req.id, 'Job updated', { jobId });
        res.json({ success: true, data: updatedJob, message: 'Job updated successfully' });
    } catch (error) {
        log.error(req.id, 'Job update error', error);
        res.status(500).json({ success: false, error: 'Failed to update job', code: 'UPDATE_ERROR' });
    }
});

router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const valid = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];
        if (!status) return res.status(400).json({ success: false, error: 'Status is required', code: 'MISSING_STATUS' });
        if (!valid.includes(status)) return res.status(400).json({ success: false, error: 'Invalid job status', code: 'INVALID_STATUS', validStatuses: valid });

        const result = await db.query(
            "UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL",
            [status, req.params.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Job not found', code: 'NOT_FOUND' });

        const updatedJob = (await db.query('SELECT * FROM jobs WHERE id = $1', [req.params.id])).rows[0];

        if (status === 'Completed') {
            let jobDetails = null;
            try {
                jobDetails = (await db.query(`
                    SELECT j.*, c.name as customer_name, c.email as customer_email,
                           COALESCE(u.name, 'Staff') as staff_name,
                           COALESCE(s.name, 'Service') as service_name,
                           COALESCE(s.price, 0) as service_price
                    FROM jobs j
                    LEFT JOIN customers c ON j.customer_id = c.id
                    LEFT JOIN users u ON j.assigned_to = u.id
                    LEFT JOIN services s ON j.service_id = s.id
                    WHERE j.id = $1
                `, [req.params.id])).rows[0];
            } catch (e) { console.warn('⚠️ Could not fetch job details on completion:', e.message); }

            if (jobDetails?.customer_id) {
                try {
                    const existing = (await db.query(
                        'SELECT id FROM invoices WHERE job_id = $1 AND deleted_at IS NULL', [req.params.id]
                    )).rows[0];
                    if (!existing) {
                        const seqRes = await db.query("SELECT nextval('invoice_number_seq') AS n");
                        const nextId = seqRes.rows[0].n;
                        const invoiceNumber = 'INV-' + String(nextId).padStart(6, '0');
                        await db.query(
                            "INSERT INTO invoices (invoice_number, job_id, customer_id, amount, status, issued_at) VALUES ($1, $2, $3, $4, 'unpaid', NOW())",
                            [invoiceNumber, req.params.id, jobDetails.customer_id, jobDetails.service_price || 0]
                        );
                        console.log(`✅ Auto-invoice ${invoiceNumber} created for job #${req.params.id}`);
                    }
                } catch (e) { console.warn('⚠️ Auto-invoice creation failed (non-critical):', e.message); }

                try {
                    if (jobDetails.customer_email) {
                        const aiAutomation = require('../utils/aiAutomation');
                        const aiSummary = await aiAutomation.generateJobSummary({ customer_name: jobDetails.customer_name, service_name: jobDetails.service_name, address: jobDetails.address || 'Customer location', duration: jobDetails.duration || 120, notes: jobDetails.notes || '' });
                        const notifications = require('../utils/notifications');
                        await notifications.sendEmail({ to: jobDetails.customer_email, subject: 'Job Completed - Stilt Heights', body: aiSummary });
                    }
                } catch (e) { console.log('⚠️ AI completion email failed (non-critical):', e.message); }
            }
        }

        log.success(req.id, 'Job status updated', { jobId: req.params.id, status });
        res.json({ success: true, data: updatedJob, message: 'Job status updated successfully' });
    } catch (error) {
        log.error(req.id, 'Status update error', error);
        res.status(500).json({ success: false, error: 'Failed to update status', code: 'UPDATE_ERROR' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE jobs SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
            [req.params.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Job not found', code: 'NOT_FOUND' });
        log.success(req.id, 'Job deleted', { jobId: req.params.id });
        res.json({ success: true, message: 'Job deleted successfully' });
    } catch (error) {
        log.error(req.id, 'Error deleting job', error);
        res.status(500).json({ success: false, error: 'Failed to delete job', code: 'DELETE_ERROR' });
    }
});

// GPS check-in when staff starts a job
router.patch('/:id/checkin', async (req, res) => {
    try {
        const { lat, lng } = req.body;
        if (!lat || !lng) return res.status(400).json({ success: false, error: 'lat and lng are required' });
        const result = await db.query(
            'UPDATE jobs SET checkin_lat = $1, checkin_lng = $2, checkin_time = NOW() WHERE id = $3 AND deleted_at IS NULL',
            [parseFloat(lat), parseFloat(lng), req.params.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Job not found' });
        res.json({ success: true, message: 'Check-in recorded' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to record check-in' });
    }
});

// Set recurrence rule on a job
router.patch('/:id/recurrence', async (req, res) => {
    try {
        const { recurrence_rule, recurrence_end_date } = req.body;
        const valid = ['weekly', 'biweekly', 'monthly', 'quarterly', ''];
        if (!valid.includes(recurrence_rule || '')) {
            return res.status(400).json({ success: false, error: 'Invalid recurrence_rule' });
        }
        await db.query(
            'UPDATE jobs SET recurrence_rule = $1, recurrence_end_date = $2 WHERE id = $3',
            [recurrence_rule || null, recurrence_end_date || null, req.params.id]
        );
        res.json({ success: true, message: 'Recurrence rule saved' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to set recurrence' });
    }
});

module.exports = router;
