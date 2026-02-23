/**
 * Accounting Module — /api/accounting
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/summary', async (_req, res) => {
    try {
        const [revenue, expenses, monthly] = await Promise.all([
            db.query(`
                SELECT
                    COALESCE(SUM(CASE WHEN status='paid'    THEN amount ELSE 0 END),0) AS paid,
                    COALESCE(SUM(CASE WHEN status='unpaid'  THEN amount ELSE 0 END),0) AS unpaid,
                    COALESCE(SUM(CASE WHEN status='overdue' THEN amount ELSE 0 END),0) AS overdue,
                    COALESCE(SUM(amount),0) AS total_invoiced,
                    COUNT(*) AS total_invoices,
                    COUNT(CASE WHEN status='paid'   THEN 1 END) AS paid_count,
                    COUNT(CASE WHEN status='unpaid' THEN 1 END) AS unpaid_count
                FROM invoices WHERE deleted_at IS NULL`),
            db.query(`
                SELECT COALESCE(SUM(amount),0) AS total_expenses, COUNT(*) AS expense_count
                FROM expenses`),
            db.query(`
                SELECT
                    COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) AS monthly_revenue,
                    COUNT(*) AS monthly_invoices
                FROM invoices
                WHERE deleted_at IS NULL AND TO_CHAR(issued_at,'YYYY-MM') = $1`,
                [new Date().toISOString().slice(0, 7)]),
        ]);

        const r = revenue.rows[0];
        const e = expenses.rows[0];
        const m = monthly.rows[0];
        const net_profit = parseFloat(r.paid) - parseFloat(e.total_expenses);

        res.json({ success: true, data: {
            revenue: { total_invoiced: r.total_invoiced, paid: r.paid, unpaid: r.unpaid, overdue: r.overdue, total_invoices: r.total_invoices, paid_count: r.paid_count, unpaid_count: r.unpaid_count },
            expenses: { total: e.total_expenses, count: e.expense_count },
            profit: { net: net_profit, margin: parseFloat(r.paid) > 0 ? ((net_profit / parseFloat(r.paid)) * 100).toFixed(1) : 0 },
            this_month: { revenue: m.monthly_revenue, invoices: m.monthly_invoices },
        }});
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/monthly', async (_req, res) => {
    try {
        const [invoiceRows, expenseRows] = await Promise.all([
            db.query(`
                SELECT TO_CHAR(issued_at,'YYYY-MM') AS month,
                    COALESCE(SUM(CASE WHEN status='paid'   THEN amount ELSE 0 END),0) AS revenue,
                    COALESCE(SUM(CASE WHEN status='unpaid' THEN amount ELSE 0 END),0) AS outstanding,
                    COUNT(*) AS invoices
                FROM invoices WHERE deleted_at IS NULL AND issued_at >= NOW()-INTERVAL '6 months'
                GROUP BY TO_CHAR(issued_at,'YYYY-MM') ORDER BY month ASC`),
            db.query(`
                SELECT TO_CHAR(expense_date,'YYYY-MM') AS month, COALESCE(SUM(amount),0) AS expenses
                FROM expenses WHERE expense_date >= NOW()-INTERVAL '6 months'
                GROUP BY TO_CHAR(expense_date,'YYYY-MM') ORDER BY month ASC`),
        ]);

        const expenseMap = {};
        expenseRows.rows.forEach(r => { expenseMap[r.month] = parseFloat(r.expenses); });

        const merged = invoiceRows.rows.map(r => ({
            month: r.month, revenue: parseFloat(r.revenue), outstanding: parseFloat(r.outstanding),
            expenses: expenseMap[r.month] || 0, profit: parseFloat(r.revenue) - (expenseMap[r.month] || 0), invoices: r.invoices,
        }));

        res.json({ success: true, data: merged });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/expenses', async (req, res) => {
    try {
        const { limit = 50, page = 1 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const [rows, total] = await Promise.all([
            db.query('SELECT * FROM expenses ORDER BY expense_date DESC, created_at DESC LIMIT $1 OFFSET $2', [parseInt(limit), offset]),
            db.query('SELECT COUNT(*) AS count FROM expenses'),
        ]);
        res.json({ success: true, data: rows.rows, total: parseInt(total.rows[0].count) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/expenses', async (req, res) => {
    try {
        const { description, amount, category, expense_date, notes } = req.body;
        if (!description || !amount) return res.status(400).json({ success: false, error: 'description and amount are required' });
        if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return res.status(400).json({ success: false, error: 'amount must be a positive number' });

        const result = await db.query(
            'INSERT INTO expenses (description, amount, category, expense_date, notes) VALUES ($1,$2,$3,$4,$5) RETURNING id',
            [description.trim(), parseFloat(amount), (category || 'General').trim(), expense_date || new Date().toISOString().split('T')[0], notes ? notes.trim() : null]
        );
        const expense = (await db.query('SELECT * FROM expenses WHERE id = $1', [result.rows[0].id])).rows[0];
        res.json({ success: true, data: expense, message: 'Expense recorded' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/expenses/:id', async (req, res) => {
    try {
        const result = await db.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Expense not found' });
        res.json({ success: true, message: 'Expense deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/top-services', async (_req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT s.name AS service, COUNT(i.id) AS invoice_count,
                COALESCE(SUM(CASE WHEN i.status='paid' THEN i.amount ELSE 0 END),0) AS revenue
            FROM invoices i
            JOIN jobs j ON i.job_id=j.id JOIN services s ON j.service_id=s.id
            WHERE i.deleted_at IS NULL GROUP BY s.name ORDER BY revenue DESC LIMIT 5`);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
