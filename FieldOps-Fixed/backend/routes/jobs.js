const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { log } = require('../middleware/logging');
const { paginate, getOne, getMany, update, handleDbError } = require('../utils/dbHelper');
const { validateJob } = require('../middleware/validate');

/**
 * GET /api/jobs - Get all jobs with pagination
 * Query params: page=1, limit=20
 */
router.get('/', async (req, res) => {
    try {
        const { page, limit } = req.query;
        
        const baseQuery = `
            SELECT j.*, 
                   c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   u.name as staff_name, u.email as staff_email,
                   s.name as service_name, s.price as service_price, s.description as service_description
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN users u ON j.assigned_to = u.id
            LEFT JOIN services s ON j.service_id = s.id
            WHERE j.deleted_at IS NULL
            ORDER BY j.created_at DESC
        `;
        
        const countQuery = 'SELECT COUNT(*) as count FROM jobs WHERE deleted_at IS NULL';
        
        const result = paginate(baseQuery, countQuery, page, limit);
        
        if (!result.success) {
            log.error(req.id, 'Jobs fetch failed', result.error);
            return res.status(result.status || 500).json(result);
        }
        
        log.success(req.id, `Fetched ${result.data.length} jobs`, {
            page: result.pagination.page,
            total: result.pagination.total
        });
        
        res.json(result);
    } catch (error) {
        log.error(req.id, 'Unexpected error fetching jobs', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch jobs',
            code: 'FETCH_ERROR',
            requestId: req.id
        });
    }
});

/**
 * POST /api/jobs - Create new job
 */
router.post('/', validateJob, async (req, res) => {
    try {
        const { customer_id, service_id, assigned_to, job_date, job_time, location, notes } = req.body;
        
        // Verify customer exists
        const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND deleted_at IS NULL').get(customer_id);
        if (!customer) {
            log.warn(req.id, 'Customer not found', { customer_id });
            return res.status(400).json({
                success: false,
                error: 'Customer not found',
                code: 'CUSTOMER_NOT_FOUND'
            });
        }
        
        // Verify service exists
        const service = db.prepare('SELECT id FROM services WHERE id = ? AND is_active = 1').get(service_id);
        if (!service) {
            log.warn(req.id, 'Service not found', { service_id });
            return res.status(400).json({
                success: false,
                error: 'Service not found',
                code: 'SERVICE_NOT_FOUND'
            });
        }
        
        // Verify staff exists if assigned
        if (assigned_to) {
            const staff = db.prepare('SELECT id FROM users WHERE id = ? AND is_active = 1').get(assigned_to);
            if (!staff) {
                log.warn(req.id, 'Staff member not found', { assigned_to });
                return res.status(400).json({
                    success: false,
                    error: 'Staff member not found',
                    code: 'STAFF_NOT_FOUND'
                });
            }
        }
        
        try {
            const result = db.prepare(`
                INSERT INTO jobs (customer_id, service_id, assigned_to, job_date, job_time, location, notes, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', datetime('now'), datetime('now'))
            `).run(customer_id, service_id, assigned_to || null, job_date, job_time, location, notes);
            
            const newJob = db.prepare(`
                SELECT j.*, 
                       c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                       u.name as staff_name, u.email as staff_email,
                       s.name as service_name, s.price as service_price, s.description as service_description
                FROM jobs j
                LEFT JOIN customers c ON j.customer_id = c.id
                LEFT JOIN users u ON j.assigned_to = u.id
                LEFT JOIN services s ON j.service_id = s.id
                WHERE j.id = ?
            `).get(result.lastInsertRowid);
            
            log.success(req.id, 'Job created', {
                jobId: result.lastInsertRowid,
                customer: customer_id,
                service: service_id,
                date: job_date
            });
            
            res.status(201).json({
                success: true,
                data: newJob,
                message: 'Job created successfully'
            });
        } catch (error) {
            const errorResponse = handleDbError(error, 'Create job failed');
            log.error(req.id, 'Job creation error', error);
            res.status(errorResponse.status || 500).json({
                success: false,
                ...errorResponse
            });
        }
    } catch (error) {
        log.error(req.id, 'Unexpected error creating job', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create job',
            code: 'CREATE_ERROR'
        });
    }
});

/**
 * GET /api/jobs/:id - Get single job
 */
router.get('/:id', async (req, res) => {
    try {
        const jobId = req.params.id;
        
        const result = getOne(`
            SELECT j.*, 
                   c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   u.name as staff_name, u.email as staff_email,
                   s.name as service_name, s.price as service_price, s.description as service_description
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN users u ON j.assigned_to = u.id
            LEFT JOIN services s ON j.service_id = s.id
            WHERE j.id = ? AND j.deleted_at IS NULL
        `, [jobId], 'Job not found');
        
        if (!result.success) {
            log.warn(req.id, 'Job not found', { jobId });
            return res.status(result.status).json(result);
        }
        
        res.json({ success: true, data: result.data });
    } catch (error) {
        log.error(req.id, 'Error fetching job', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch job',
            code: 'FETCH_ERROR'
        });
    }
});

/**
 * PATCH /api/jobs/:id - Update job
 */
router.patch('/:id', validateJob, async (req, res) => {
    try {
        const jobId = req.params.id;
        const { customer_id, service_id, assigned_to, job_date, job_time, location, notes, status } = req.body;
        
        // Check if job exists
        const existingJob = db.prepare('SELECT id FROM jobs WHERE id = ? AND deleted_at IS NULL').get(jobId);
        if (!existingJob) {
            log.warn(req.id, 'Job not found', { jobId });
            return res.status(404).json({
                success: false,
                error: 'Job not found',
                code: 'NOT_FOUND'
            });
        }
        
        // Build dynamic update query
        const updates = [];
        const values = [];
        
        if (customer_id !== undefined) {
            // Verify customer exists
            const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND deleted_at IS NULL').get(customer_id);
            if (!customer) {
                return res.status(400).json({
                    success: false,
                    error: 'Customer not found',
                    code: 'CUSTOMER_NOT_FOUND'
                });
            }
            updates.push('customer_id = ?');
            values.push(customer_id);
        }
        
        if (service_id !== undefined) {
            const service = db.prepare('SELECT id FROM services WHERE id = ? AND is_active = 1').get(service_id);
            if (!service) {
                return res.status(400).json({
                    success: false,
                    error: 'Service not found',
                    code: 'SERVICE_NOT_FOUND'
                });
            }
            updates.push('service_id = ?');
            values.push(service_id);
        }
        
        if (assigned_to !== undefined) {
            if (assigned_to !== null) {
                const staff = db.prepare('SELECT id FROM users WHERE id = ? AND is_active = 1').get(assigned_to);
                if (!staff) {
                    return res.status(400).json({
                        success: false,
                        error: 'Staff member not found',
                        code: 'STAFF_NOT_FOUND'
                    });
                }
            }
            updates.push('assigned_to = ?');
            values.push(assigned_to);
        }
        
        if (job_date !== undefined) {
            updates.push('job_date = ?');
            values.push(job_date);
        }
        
        if (job_time !== undefined) {
            updates.push('job_time = ?');
            values.push(job_time);
        }
        
        if (location !== undefined) {
            updates.push('location = ?');
            values.push(location);
        }
        
        if (notes !== undefined) {
            updates.push('notes = ?');
            values.push(notes);
        }
        
        if (status !== undefined) {
            const validStatuses = ['scheduled', 'in-progress', 'completed', 'cancelled'];
            if (!validStatuses.includes(status.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid job status',
                    code: 'INVALID_STATUS',
                    validStatuses
                });
            }
            updates.push('status = ?');
            values.push(status);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No fields to update',
                code: 'NO_UPDATES'
            });
        }
        
        // Always update updated_at
        updates.push('updated_at = datetime("now")');
        values.push(jobId);
        
        try {
            const result = db.prepare(`
                UPDATE jobs 
                SET ${updates.join(', ')}
                WHERE id = ?
            `).run(...values);
            
            // Fetch updated job
            const updatedJob = db.prepare(`
                SELECT j.*, 
                       c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                       u.name as staff_name, u.email as staff_email,
                       s.name as service_name, s.price as service_price, s.description as service_description
                FROM jobs j
                LEFT JOIN customers c ON j.customer_id = c.id
                LEFT JOIN users u ON j.assigned_to = u.id
                LEFT JOIN services s ON j.service_id = s.id
                WHERE j.id = ?
            `).get(jobId);
            
            log.success(req.id, 'Job updated', { jobId, changes: result.changes });
            
            res.json({
                success: true,
                data: updatedJob,
                message: 'Job updated successfully'
            });
        } catch (error) {
            const errorResponse = handleDbError(error, 'Update job failed');
            log.error(req.id, 'Job update error', error);
            res.status(errorResponse.status || 500).json({
                success: false,
                ...errorResponse
            });
        }
    } catch (error) {
        log.error(req.id, 'Unexpected error updating job', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update job',
            code: 'UPDATE_ERROR'
        });
    }
});

/**
 * PATCH /api/jobs/:id/status - Update job status only
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required',
                code: 'MISSING_STATUS'
            });
        }
        
        const validStatuses = ['scheduled', 'in-progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid job status',
                code: 'INVALID_STATUS',
                validStatuses
            });
        }
        
        try {
            const result = db.prepare(
                'UPDATE jobs SET status = ?, updated_at = datetime("now") WHERE id = ? AND deleted_at IS NULL'
            ).run(status, req.params.id);
            
            if (result.changes === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Job not found',
                    code: 'NOT_FOUND'
                });
            }
            
            const updatedJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
            
            log.success(req.id, 'Job status updated', { jobId: req.params.id, status });
            
            res.json({
                success: true,
                data: updatedJob,
                message: 'Job status updated successfully'
            });
        } catch (error) {
            const errorResponse = handleDbError(error, 'Update status failed');
            log.error(req.id, 'Status update error', error);
            res.status(errorResponse.status || 500).json({
                success: false,
                ...errorResponse
            });
        }
    } catch (error) {
        log.error(req.id, 'Unexpected error updating status', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update status',
            code: 'UPDATE_ERROR'
        });
    }
});

/**
 * DELETE /api/jobs/:id - Soft delete job
 */
router.delete('/:id', async (req, res) => {
    try {
        const jobId = req.params.id;
        
        const result = db.prepare(
            'UPDATE jobs SET deleted_at = datetime("now") WHERE id = ? AND deleted_at IS NULL'
        ).run(jobId);
        
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Job not found',
                code: 'NOT_FOUND'
            });
        }
        
        log.success(req.id, 'Job deleted', { jobId });
        
        res.json({
            success: true,
            message: 'Job deleted successfully'
        });
    } catch (error) {
        log.error(req.id, 'Error deleting job', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete job',
            code: 'DELETE_ERROR'
        });
    }
});

module.exports = router;
