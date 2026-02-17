const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { log } = require('../middleware/logging');
const { paginate, getOne, handleDbError } = require('../utils/dbHelper');
const PDFDocument = require('pdfkit');

/**
 * GET /api/invoices - Get all invoices with pagination
 * Query params: page=1, limit=20
 */
router.get('/', async (req, res) => {
    try {
        const { page, limit } = req.query;
        
        const baseQuery = `
            SELECT i.*, 
                   c.name as customer_name, c.email as customer_email,
                   j.service_id, j.job_date
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN jobs j ON i.job_id = j.id
            WHERE i.deleted_at IS NULL
            ORDER BY i.issued_at DESC
        `;
        
        const countQuery = 'SELECT COUNT(*) as count FROM invoices WHERE deleted_at IS NULL';
        
        const result = paginate(baseQuery, countQuery, page, limit);
        
        if (!result.success) {
            log.error(req.id, 'Invoices fetch failed', result.error);
            return res.status(result.status || 500).json(result);
        }
        
        log.success(req.id, `Fetched ${result.data.length} invoices`, {
            page: result.pagination.page,
            total: result.pagination.total
        });
        
        res.json(result);
    } catch (error) {
        log.error(req.id, 'Unexpected error fetching invoices', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch invoices',
            code: 'FETCH_ERROR',
            requestId: req.id
        });
    }
});

/**
 * GET /api/invoices/:id - Get single invoice
 */
router.get('/:id', async (req, res) => {
    try {
        const invoiceId = req.params.id;
        
        const result = getOne(`
            SELECT i.*, 
                   j.job_date, j.location, j.notes as job_notes,
                   s.name as service_name, s.price as service_price,
                   c.email as customer_email, c.phone as customer_phone, c.address as customer_address
            FROM invoices i
            LEFT JOIN jobs j ON i.job_id = j.id
            LEFT JOIN services s ON j.service_id = s.id
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE i.id = ? AND i.deleted_at IS NULL
        `, [invoiceId], 'Invoice not found');
        
        if (!result.success) {
            log.warn(req.id, 'Invoice not found', { invoiceId });
            return res.status(result.status).json(result);
        }
        
        res.json({ success: true, data: result.data });
    } catch (error) {
        log.error(req.id, 'Error fetching invoice', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch invoice',
            code: 'FETCH_ERROR',
            requestId: req.id
        });
    }
});

/**
 * POST /api/invoices/create - Create invoice from job
 * Body: { job_id }
 */
router.post('/create', async (req, res) => {
    try {
        const { job_id } = req.body;
        
        if (!job_id) {
            return res.status(400).json({
                success: false,
                error: 'Job ID is required',
                code: 'MISSING_JOB_ID'
            });
        }
        
        // Get job details (with transaction for data consistency)
        try {
            const job = db.prepare(`
                SELECT j.*, c.name as customer_name, c.email as customer_email, c.id as customer_id,
                       s.name as service_name, s.price as service_price
                FROM jobs j
                LEFT JOIN customers c ON j.customer_id = c.id
                LEFT JOIN services s ON j.service_id = s.id
                WHERE j.id = ? AND j.deleted_at IS NULL
            `).get(job_id);
            
            if (!job) {
                log.warn(req.id, 'Job not found for invoice', { job_id });
                return res.status(400).json({
                    success: false,
                    error: 'Job not found',
                    code: 'JOB_NOT_FOUND'
                });
            }
            
            // Check if invoice already exists for this job
            const existingInvoice = db.prepare(
                'SELECT id FROM invoices WHERE job_id = ? AND deleted_at IS NULL'
            ).get(job_id);
            
            if (existingInvoice) {
                log.warn(req.id, 'Invoice already exists for job', { job_id });
                return res.status(400).json({
                    success: false,
                    error: 'Invoice already exists for this job',
                    code: 'INVOICE_EXISTS'
                });
            }
            
            // Generate invoice number
            const lastInv = db.prepare('SELECT MAX(id) as maxId FROM invoices').get();
            const nextId = (lastInv.maxId || 0) + 1;
            const invoiceNumber = 'INV-' + String(nextId).padStart(6, '0');
            
            const amount = job.service_price || 0;
            
            // Create invoice using transaction
            const transaction = db.transaction(() => {
                const result = db.prepare(`
                    INSERT INTO invoices (invoice_number, job_id, customer_id, amount, status, issued_at, created_at)
                    VALUES (?, ?, ?, ?, 'unpaid', datetime('now'), datetime('now'))
                `).run(invoiceNumber, job_id, job.customer_id, amount);
                
                return result.lastInsertRowid;
            });
            
            const invoiceId = transaction();
            
            // Get created invoice
            const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
            
            log.success(req.id, 'Invoice created', {
                invoiceId,
                invoiceNumber,
                jobId: job_id,
                customer: job.customer_name,
                amount
            });
            
            // Send notification (non-blocking)
            try {
                const notifications = require('../utils/notifications');
                const invoiceData = {
                    customer_name: job.customer_name,
                    email: job.customer_email,
                    invoice_number: invoiceNumber,
                    amount: amount,
                    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    service_name: job.service_name
                };
                
                notifications.sendInvoiceNotification(invoiceData).catch(err => {
                    log.warn(req.id, 'Invoice notification failed (non-critical)', { error: err.message });
                });
            } catch (notifError) {
                log.warn(req.id, 'Notification module not available', { error: notifError.message });
            }
            
            res.status(201).json({
                success: true,
                data: invoice,
                message: 'Invoice created successfully'
            });
        } catch (dbError) {
            const errorResponse = handleDbError(dbError, 'Create invoice failed');
            log.error(req.id, 'Invoice creation error', dbError);
            res.status(errorResponse.status || 500).json({
                success: false,
                ...errorResponse
            });
        }
    } catch (error) {
        log.error(req.id, 'Unexpected error creating invoice', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create invoice',
            code: 'CREATE_ERROR',
            requestId: req.id
        });
    }
});

/**
 * PATCH /api/invoices/:id/pay - Mark invoice as paid
 */
router.patch('/:id/pay', async (req, res) => {
    try {
        const invoiceId = req.params.id;
        
        try {
            // Update invoice status to paid
            const result = db.prepare(`
                UPDATE invoices 
                SET status = 'paid', paid_date = datetime('now')
                WHERE id = ? AND deleted_at IS NULL
            `).run(invoiceId);
            
            if (result.changes === 0) {
                log.warn(req.id, 'Invoice not found', { invoiceId });
                return res.status(404).json({
                    success: false,
                    error: 'Invoice not found',
                    code: 'NOT_FOUND'
                });
            }
            
            const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
            
            log.success(req.id, 'Invoice marked as paid', {
                invoiceId,
                invoiceNumber: invoice.invoice_number
            });
            
            // Emit real-time update if Socket.io available
            try {
                const io = req.app.get('io');
                if (io) {
                    io.to('admin').emit('invoice-updated', { invoice });
                }
            } catch (ioError) {
                log.warn(req.id, 'Real-time update failed', { error: ioError.message });
            }
            
            res.json({
                success: true,
                data: invoice,
                message: 'Invoice marked as paid successfully'
            });
        } catch (dbError) {
            const errorResponse = handleDbError(dbError, 'Mark paid failed');
            log.error(req.id, 'Mark paid error', dbError);
            res.status(errorResponse.status || 500).json({
                success: false,
                ...errorResponse
            });
        }
    } catch (error) {
        log.error(req.id, 'Unexpected error marking invoice paid', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark invoice as paid',
            code: 'UPDATE_ERROR',
            requestId: req.id
        });
    }
});

/**
 * PATCH /api/invoices/:id/status - Update invoice status
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const { status, paid_date } = req.body;
        
        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required',
                code: 'MISSING_STATUS'
            });
        }
        
        const validStatuses = ['paid', 'unpaid', 'partial', 'overdue', 'cancelled'];
        if (!validStatuses.includes(status.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status',
                code: 'INVALID_STATUS',
                validStatuses
            });
        }
        
        try {
            const result = db.prepare(`
                UPDATE invoices 
                SET status = ?, paid_date = ?
                WHERE id = ? AND deleted_at IS NULL
            `).run(status, paid_date || null, req.params.id);
            
            if (result.changes === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Invoice not found',
                    code: 'NOT_FOUND'
                });
            }
            
            const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
            
            log.success(req.id, 'Invoice status updated', {
                invoiceId: req.params.id,
                status
            });
            
            res.json({
                success: true,
                data: invoice,
                message: `Invoice marked as ${status}`
            });
        } catch (dbError) {
            const errorResponse = handleDbError(dbError, 'Status update failed');
            log.error(req.id, 'Status update error', dbError);
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
            code: 'UPDATE_ERROR',
            requestId: req.id
        });
    }
});

/**
 * GET /api/invoices/summary/stats - Get invoices summary
 */
router.get('/summary/stats', async (req, res) => {
    try {
        const stats = db.prepare(`
            SELECT 
                status,
                COUNT(*) as count,
                SUM(amount) as total
            FROM invoices
            WHERE deleted_at IS NULL
            GROUP BY status
        `).all();
        
        log.success(req.id, 'Fetched invoice stats', { statuses: stats.length });
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        log.error(req.id, 'Error fetching stats', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics',
            code: 'STATS_ERROR',
            requestId: req.id
        });
    }
});

/**
 * GET /api/invoices/:id/pdf - Generate PDF invoice
 */
router.get('/:id/pdf', requireAuth, (req, res) => {
    try {
        const invoiceId = req.params.id;
        
        const invoice = db.prepare(`
            SELECT i.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
                   c.address as customer_address, j.job_date, j.notes as job_notes,
                   s.name as service_name
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN jobs j ON i.job_id = j.id
            LEFT JOIN services s ON j.service_id = s.id
            WHERE i.id = ? AND i.deleted_at IS NULL
        `).get(invoiceId);

        if (!invoice) {
            log.warn(req.id, 'Invoice not found for PDF', { invoiceId });
            return res.status(404).json({
                success: false,
                error: 'Invoice not found',
                code: 'NOT_FOUND'
            });
        }

        // Generate PDF
        const doc = new PDFDocument({ margin: 50 });
        const filename = `invoice-${invoice.invoice_number || invoice.id}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('X-Request-ID', req.id);

        doc.pipe(res);

        // PDF content
        doc.fontSize(24).fillColor('#1E293B').text('INVOICE', 50, 50);
        doc.fontSize(12).fillColor('#64748B')
           .text(`Invoice #: ${invoice.invoice_number || invoice.id}`, 50, 80)
           .text(`Date: ${new Date(invoice.issued_at).toLocaleDateString()}`, 50, 95);
        
        doc.fontSize(14).fillColor('#374151').text('Bill To:', 50, 130);
        doc.fontSize(12).fillColor('#64748B')
           .text(invoice.customer_name || 'N/A', 50, 150)
           .text(invoice.customer_email || 'N/A', 50, 165)
           .text(invoice.customer_phone || 'N/A', 50, 180)
           .text(invoice.customer_address || 'N/A', 50, 195);

        doc.moveTo(50, 215).lineTo(550, 215).strokeColor('#1E293B').lineWidth(1).stroke();
        doc.font('Helvetica-Bold').fontSize(10)
           .text('Service', 50, 200).text('Date', 250, 200).text('Amount', 450, 200, { align: 'right', width: 100 });
        doc.font('Helvetica').fontSize(10).fillColor('#374151')
           .text(invoice.service_name || 'Cleaning Service', 50, 230)
           .text(invoice.job_date ? new Date(invoice.job_date).toLocaleDateString() : 'N/A', 250, 230)
           .text(`$${(invoice.amount || 0).toFixed(2)}`, 450, 230, { align: 'right', width: 100 });

        doc.font('Helvetica-Bold').fontSize(14).fillColor('#1E293B')
           .text(`TOTAL: $${(invoice.amount || 0).toFixed(2)}`, 350, 270, { align: 'right' });

        doc.fontSize(9).fillColor('#94A3B8').font('Helvetica')
           .text('Payment due within 30 days. Thank you for your business.', 50, 720, { align: 'center' });

        doc.end();
        
        log.success(req.id, 'PDF generated', { invoiceId, filename });
    } catch (error) {
        log.error(req.id, 'PDF generation error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate PDF',
            code: 'PDF_ERROR',
            requestId: req.id
        });
    }
});

/**
 * DELETE /api/invoices/:id - Soft delete invoice
 */
router.delete('/:id', async (req, res) => {
    try {
        const invoiceId = req.params.id;
        
        const result = db.prepare(
            'UPDATE invoices SET deleted_at = datetime("now") WHERE id = ? AND deleted_at IS NULL'
        ).run(invoiceId);
        
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Invoice not found',
                code: 'NOT_FOUND'
            });
        }
        
        log.success(req.id, 'Invoice deleted', { invoiceId });
        
        res.json({
            success: true,
            message: 'Invoice deleted successfully'
        });
    } catch (error) {
        log.error(req.id, 'Error deleting invoice', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete invoice',
            code: 'DELETE_ERROR',
            requestId: req.id
        });
    }
});

module.exports = router;
