const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// Get all invoices
router.get('/', async (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT i.*, 
                   c.name as customer_name, c.email as customer_email,
                   j.service_id, j.job_date
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN jobs j ON i.job_id = j.id
            ORDER BY i.issued_at DESC
        `);
        const invoices = stmt.all();
        res.json(invoices);
    } catch (error) {
        console.error('Invoices API error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get invoice by ID
router.get('/:id', async (req, res) => {
    try {
        const invoice = db.prepare(`
            SELECT i.*, 
                   j.job_date, j.location, j.notes as job_notes,
                   s.name as service_name, s.price as service_price,
                   c.email as customer_email, c.phone as customer_phone, c.address as customer_address
            FROM invoices i
            LEFT JOIN jobs j ON i.job_id = j.id
            LEFT JOIN services s ON j.service_id = s.id
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE i.id = ?
        `).get(req.params.id);
        
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create invoice from job
router.post('/create', async (req, res) => {
    try {
        const { job_id } = req.body;
        
        // Get job details
        const job = db.prepare(`
            SELECT j.*, c.name as customer_name, c.id as customer_id
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            WHERE j.id = ?
        `).get(job_id);
        
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        // Check if invoice already exists
        const existingInvoice = db.prepare('SELECT id FROM invoices WHERE job_id = ?').get(job_id);
        if (existingInvoice) {
            return res.status(400).json({ error: 'Invoice already exists for this job' });
        }
        
        // Generate invoice number
        const lastInv = db.prepare('SELECT MAX(id) as maxId FROM invoices').get();
        const nextId = (lastInv.maxId || 0) + 1;
        const invoiceNumber = 'INV-' + String(nextId).padStart(6, '0');
        
        // Get service price
        const service = db.prepare('SELECT price FROM services WHERE id = ?').get(job.service_id);
        const amount = service?.price || 0;
        
        // Create invoice
        const insertInvoice = db.prepare(`
            INSERT INTO invoices (invoice_number, job_id, customer_id, amount, status, issued_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `);
        
        const result = insertInvoice.run(
            invoiceNumber,
            job_id,
            job.customer_id,
            amount,
            'unpaid'
        );
        
        // Get created invoice
        const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(result.lastInsertRowid);
        
        console.log(`📄 Invoice created: ${invoiceNumber} for ${job.customer_name}`);
        
        // Send invoice email notification
        try {
            const notifications = require('../utils/notifications');
            const invoiceData = {
                customer_name: job.customer_name,
                email: job.email,
                invoice_number: invoiceNumber,
                amount: amount,
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                service_name: job.service_name
            };
            
            await notifications.sendInvoiceNotification(invoiceData);
        } catch (notifError) {
            console.log('Invoice notification error (non-critical):', notifError);
        }
        
        res.json({ 
            success: true, 
            invoice: {
                ...invoice,
                invoice_number: invoiceNumber
            },
            message: 'Invoice created successfully' 
        });
        
    } catch (error) {
        console.error('Invoice creation error:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
});

// Mark invoice as paid
router.patch('/:id/pay', async (req, res) => {
    try {
        const invoiceId = req.params.id;
        
        // Update invoice status to paid
        const updateInvoice = db.prepare(`
            UPDATE invoices 
            SET status = 'Paid', paid_date = datetime('now')
            WHERE id = ?
        `);
        
        const result = updateInvoice.run(invoiceId);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
        
        console.log(`💰 Invoice ${invoice.invoice_number || invoice.id} marked as paid`);
        
        // Emit real-time update
        const io = req.app.get('io');
        io.to('admin').emit('invoice-updated', { invoice });
        
        res.json({
            success: true,
            invoice,
            message: 'Invoice marked as paid successfully'
        });
        
    } catch (error) {
        console.error('Mark invoice paid error:', error);
        res.status(500).json({ error: 'Failed to mark invoice as paid' });
    }
});

// Update invoice status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status, paid_date } = req.body;
        
        if (!['Paid', 'Unpaid', 'Partial'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const updateInvoice = db.prepare(`
            UPDATE invoices 
            SET status = ?, paid_date = ?
            WHERE id = ?
        `);
        
        const result = updateInvoice.run(status, paid_date || null, req.params.id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
        
        console.log(`💰 Invoice ${invoice.invoice_number} marked as ${status}`);
        
        res.json({ 
            success: true, 
            invoice,
            message: `Invoice marked as ${status}` 
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get invoices summary
router.get('/summary/stats', async (req, res) => {
    try {
        const stats = db.prepare(`
            SELECT 
                status,
                COUNT(*) as count,
                SUM(amount) as total
            FROM invoices
            GROUP BY status
        `).all();
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PDF generation route
router.get('/:id/pdf', requireAuth, (req, res) => {
    try {
        const invoiceId = req.params.id;
        
        const invoice = db.prepare(`
            SELECT i.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
                   c.address as customer_address, j.job_date, j.notes as job_notes
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN jobs j ON i.job_id = j.id
            WHERE i.id = ?
        `).get(invoiceId);

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Generate PDF
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_number || invoice.id}.pdf`);

        doc.pipe(res);

        // PDF content
        doc.fontSize(24).fillColor('#1E293B').text('INVOICE', 50, 50);
        doc.fontSize(12).fillColor('#64748B').text(`Invoice #: ${invoice.invoice_number || invoice.id}`, 50, 80);
        doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 50, 95);
        
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
    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

module.exports = router;
