const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { log } = require('../middleware/logging');
const { paginate, handleDbError } = require('../utils/dbHelper');
const PDFDocument = require('pdfkit');

router.get('/', async (req, res) => {
    try {
        const { page, limit } = req.query;
        const result = await paginate(
            `SELECT i.*, c.name as customer_name, c.email as customer_email, j.service_id, j.job_date
             FROM invoices i
             LEFT JOIN customers c ON i.customer_id = c.id
             LEFT JOIN jobs j ON i.job_id = j.id
             WHERE i.deleted_at IS NULL ORDER BY i.issued_at DESC`,
            'SELECT COUNT(*) as count FROM invoices WHERE deleted_at IS NULL',
            page, limit
        );
        if (!result.success) return res.status(result.status || 500).json(result);
        res.json(result);
    } catch (error) {
        log.error(req.id, 'Unexpected error fetching invoices', error);
        res.status(500).json({ success: false, error: 'Failed to fetch invoices', code: 'FETCH_ERROR' });
    }
});

router.get('/summary/stats', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT status, COUNT(*) as count, SUM(amount) as total
            FROM invoices WHERE deleted_at IS NULL GROUP BY status
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        log.error(req.id, 'Error fetching stats', error);
        res.status(500).json({ success: false, error: 'Failed to fetch statistics', code: 'STATS_ERROR' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT i.*, j.job_date, j.location, j.notes as job_notes,
                   s.name as service_name, s.price as service_price,
                   c.email as customer_email, c.phone as customer_phone, c.address as customer_address
            FROM invoices i
            LEFT JOIN jobs j ON i.job_id = j.id
            LEFT JOIN services s ON j.service_id = s.id
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE i.id = $1 AND i.deleted_at IS NULL
        `, [req.params.id]);
        if (!rows[0]) return res.status(404).json({ success: false, error: 'Invoice not found', code: 'NOT_FOUND' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        log.error(req.id, 'Error fetching invoice', error);
        res.status(500).json({ success: false, error: 'Failed to fetch invoice', code: 'FETCH_ERROR' });
    }
});

router.post('/create', async (req, res) => {
    try {
        const { job_id } = req.body;
        if (!job_id) return res.status(400).json({ success: false, error: 'Job ID is required', code: 'MISSING_JOB_ID' });

        const job = (await db.query(`
            SELECT j.*, c.name as customer_name, c.email as customer_email, c.id as customer_id,
                   s.name as service_name, s.price as service_price
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN services s ON j.service_id = s.id
            WHERE j.id = $1 AND j.deleted_at IS NULL
        `, [job_id])).rows[0];
        if (!job) return res.status(400).json({ success: false, error: 'Job not found', code: 'JOB_NOT_FOUND' });

        const existing = (await db.query('SELECT id FROM invoices WHERE job_id = $1 AND deleted_at IS NULL', [job_id])).rows[0];
        if (existing) return res.status(400).json({ success: false, error: 'Invoice already exists for this job', code: 'INVOICE_EXISTS' });

        // Use PostgreSQL sequence for atomic, race-condition-free invoice numbering
        const seqRes = await db.query("SELECT nextval('invoice_number_seq') AS n");
        const invoiceNumber = 'INV-' + String(seqRes.rows[0].n).padStart(6, '0');
        const amount = job.service_price || 0;

        const invoiceResult = await db.query(
            "INSERT INTO invoices (invoice_number, job_id, customer_id, amount, status, issued_at) VALUES ($1, $2, $3, $4, 'unpaid', NOW()) RETURNING id",
            [invoiceNumber, job_id, job.customer_id, amount]
        );
        const invoiceId = invoiceResult.rows[0].id;
        const invoice = (await db.query('SELECT * FROM invoices WHERE id = $1', [invoiceId])).rows[0];

        // Send email non-blocking
        setImmediate(async () => {
            try {
                if (job.customer_email) {
                    const { sendInvoiceEmail } = require('../utils/emailTemplates');
                    const branding = require('../config/branding');
                    const customer = (await db.query('SELECT * FROM customers WHERE id = $1', [job.customer_id])).rows[0];
                    await sendInvoiceEmail({
                        customer_name: job.customer_name, customer_email: job.customer_email,
                        customer_phone: customer?.phone,
                        invoice_number: invoiceNumber,
                        issued_date: new Date().toLocaleDateString(),
                        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                        service_name: job.service_name, job_date: job.job_date,
                        amount: amount.toFixed(2), payment_status: 'Unpaid',
                        payment_status_color: '#fff3cd', payment_status_accent: '#ffc107',
                        company_name: branding.name, company_phone: branding.phone,
                        company_email: branding.email, company_website: branding.website,
                        company_address: branding.city
                    });
                }
            } catch (e) { console.warn('⚠️ Invoice email failed (non-critical):', e.message); }
        });

        log.success(req.id, 'Invoice created', { invoiceId, invoiceNumber });
        res.status(201).json({ success: true, data: invoice, message: 'Invoice created successfully' });
    } catch (error) {
        log.error(req.id, 'Invoice creation error', error);
        res.status(500).json({ success: false, error: 'Failed to create invoice', code: 'CREATE_ERROR' });
    }
});

router.patch('/:id/pay', async (req, res) => {
    try {
        const result = await db.query(
            "UPDATE invoices SET status = 'paid', paid_date = NOW() WHERE id = $1 AND deleted_at IS NULL",
            [req.params.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Invoice not found', code: 'NOT_FOUND' });
        const invoice = (await db.query('SELECT * FROM invoices WHERE id = $1', [req.params.id])).rows[0];
        try { const io = req.app.get('io'); if (io) io.to('admin').emit('invoice-updated', { invoice }); } catch (_) {}
        res.json({ success: true, data: invoice, message: 'Invoice marked as paid successfully' });
    } catch (error) {
        log.error(req.id, 'Mark paid error', error);
        res.status(500).json({ success: false, error: 'Failed to mark invoice as paid', code: 'UPDATE_ERROR' });
    }
});

router.patch('/:id/status', async (req, res) => {
    try {
        const { status, paid_date } = req.body;
        if (!status) return res.status(400).json({ success: false, error: 'Status is required', code: 'MISSING_STATUS' });
        const validStatuses = ['paid','unpaid','partial','overdue','cancelled'];
        if (!validStatuses.includes(status.toLowerCase())) return res.status(400).json({ success: false, error: 'Invalid status', code: 'INVALID_STATUS', validStatuses });

        const result = await db.query(
            'UPDATE invoices SET status = $1, paid_date = $2 WHERE id = $3 AND deleted_at IS NULL',
            [status, paid_date || null, req.params.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Invoice not found', code: 'NOT_FOUND' });
        const invoice = (await db.query('SELECT * FROM invoices WHERE id = $1', [req.params.id])).rows[0];
        res.json({ success: true, data: invoice, message: `Invoice marked as ${status}` });
    } catch (error) {
        log.error(req.id, 'Status update error', error);
        res.status(500).json({ success: false, error: 'Failed to update status', code: 'UPDATE_ERROR' });
    }
});

router.get('/:id/pdf', requireAuth, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT i.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
                   c.address as customer_address, j.job_date, j.notes as job_notes, s.name as service_name
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN jobs j ON i.job_id = j.id
            LEFT JOIN services s ON j.service_id = s.id
            WHERE i.id = $1 AND i.deleted_at IS NULL
        `, [req.params.id]);
        if (!rows[0]) return res.status(404).json({ success: false, error: 'Invoice not found', code: 'NOT_FOUND' });
        const invoice = rows[0];

        const doc = new PDFDocument({ margin: 50 });
        const filename = `invoice-${invoice.invoice_number || invoice.id}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);

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
        doc.font('Helvetica-Bold').fontSize(10).text('Service', 50, 200).text('Date', 250, 200).text('Amount', 450, 200, { align: 'right', width: 100 });
        doc.font('Helvetica').fontSize(10).fillColor('#374151')
           .text(invoice.service_name || 'Cleaning Service', 50, 230)
           .text(invoice.job_date ? new Date(invoice.job_date).toLocaleDateString() : 'N/A', 250, 230)
           .text(`$${(invoice.amount || 0).toFixed(2)}`, 450, 230, { align: 'right', width: 100 });
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#1E293B')
           .text(`TOTAL: $${(invoice.amount || 0).toFixed(2)}`, 350, 270, { align: 'right' });
        doc.fontSize(9).fillColor('#94A3B8').font('Helvetica')
           .text('Payment due within 30 days. Thank you for your business.', 50, 720, { align: 'center' });
        doc.end();
    } catch (error) {
        log.error(req.id, 'PDF generation error', error);
        res.status(500).json({ success: false, error: 'Failed to generate PDF', code: 'PDF_ERROR' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await db.query('UPDATE invoices SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Invoice not found', code: 'NOT_FOUND' });
        res.json({ success: true, message: 'Invoice deleted successfully' });
    } catch (error) {
        log.error(req.id, 'Error deleting invoice', error);
        res.status(500).json({ success: false, error: 'Failed to delete invoice', code: 'DELETE_ERROR' });
    }
});

module.exports = router;
