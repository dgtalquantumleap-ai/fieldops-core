/**
 * Accounting Module — /api/accounting
 * Revenue summary, expense tracking, and P&L for Stilt Heights
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// All accounting routes require auth
router.use(requireAuth);

// ─────────────────────────────────────────
// GET /api/accounting/summary
// Overall P&L snapshot
// ─────────────────────────────────────────
router.get('/summary', (req, res) => {
    try {
        const revenue = db.prepare(`
            SELECT
                COALESCE(SUM(CASE WHEN status = 'paid'   THEN amount ELSE 0 END), 0) AS paid,
                COALESCE(SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END), 0) AS unpaid,
                COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END), 0) AS overdue,
                COALESCE(SUM(amount), 0) AS total_invoiced,
                COUNT(*) AS total_invoices,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) AS paid_count,
                COUNT(CASE WHEN status = 'unpaid' THEN 1 END) AS unpaid_count
            FROM invoices
            WHERE deleted_at IS NULL
        `).get();

        const expenses = db.prepare(`
            SELECT
                COALESCE(SUM(amount), 0) AS total_expenses,
                COUNT(*) AS expense_count
            FROM expenses
        `).get();

        const net_profit = revenue.paid - expenses.total_expenses;

        // Jobs completed this month
        const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const monthly = db.prepare(`
            SELECT
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS monthly_revenue,
                COUNT(*) AS monthly_invoices
            FROM invoices
            WHERE deleted_at IS NULL
              AND strftime('%Y-%m', issued_at) = ?
        `).get(thisMonth);

        res.json({
            success: true,
            data: {
                revenue: {
                    total_invoiced: revenue.total_invoiced,
                    paid: revenue.paid,
                    unpaid: revenue.unpaid,
                    overdue: revenue.overdue,
                    total_invoices: revenue.total_invoices,
                    paid_count: revenue.paid_count,
                    unpaid_count: revenue.unpaid_count,
                },
                expenses: {
                    total: expenses.total_expenses,
                    count: expenses.expense_count,
                },
                profit: {
                    net: net_profit,
                    margin: revenue.paid > 0 ? ((net_profit / revenue.paid) * 100).toFixed(1) : 0,
                },
                this_month: {
                    revenue: monthly.monthly_revenue,
                    invoices: monthly.monthly_invoices,
                },
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─────────────────────────────────────────
// GET /api/accounting/monthly
// Last 6 months revenue breakdown
// ─────────────────────────────────────────
router.get('/monthly', (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT
                strftime('%Y-%m', issued_at) AS month,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)   AS revenue,
                COALESCE(SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END), 0) AS outstanding,
                COUNT(*) AS invoices
            FROM invoices
            WHERE deleted_at IS NULL
              AND issued_at >= date('now', '-6 months')
            GROUP BY month
            ORDER BY month ASC
        `).all();

        // Also get monthly expenses
        const expenseRows = db.prepare(`
            SELECT
                strftime('%Y-%m', expense_date) AS month,
                COALESCE(SUM(amount), 0) AS expenses
            FROM expenses
            WHERE expense_date >= date('now', '-6 months')
            GROUP BY month
            ORDER BY month ASC
        `).all();

        // Merge into a single array by month
        const expenseMap = {};
        expenseRows.forEach(r => { expenseMap[r.month] = r.expenses; });

        const merged = rows.map(r => ({
            month: r.month,
            revenue: r.revenue,
            outstanding: r.outstanding,
            expenses: expenseMap[r.month] || 0,
            profit: r.revenue - (expenseMap[r.month] || 0),
            invoices: r.invoices,
        }));

        res.json({ success: true, data: merged });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─────────────────────────────────────────
// GET /api/accounting/expenses
// List all expenses (newest first)
// ─────────────────────────────────────────
router.get('/expenses', (req, res) => {
    try {
        const { limit = 50, page = 1 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const rows = db.prepare(`
            SELECT * FROM expenses
            ORDER BY expense_date DESC, created_at DESC
            LIMIT ? OFFSET ?
        `).all(parseInt(limit), offset);

        const total = db.prepare('SELECT COUNT(*) AS count FROM expenses').get().count;

        res.json({ success: true, data: rows, total });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─────────────────────────────────────────
// POST /api/accounting/expenses
// Add a new expense
// ─────────────────────────────────────────
router.post('/expenses', (req, res) => {
    try {
        const { description, amount, category, expense_date, notes } = req.body;

        if (!description || !amount) {
            return res.status(400).json({ success: false, error: 'description and amount are required' });
        }
        if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({ success: false, error: 'amount must be a positive number' });
        }

        const result = db.prepare(`
            INSERT INTO expenses (description, amount, category, expense_date, notes)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            description.trim(),
            parseFloat(amount),
            (category || 'General').trim(),
            expense_date || new Date().toISOString().split('T')[0],
            notes ? notes.trim() : null
        );

        const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
        res.json({ success: true, data: expense, message: 'Expense recorded' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─────────────────────────────────────────
// DELETE /api/accounting/expenses/:id
// Remove an expense
// ─────────────────────────────────────────
router.delete('/expenses/:id', (req, res) => {
    try {
        const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: 'Expense not found' });
        }
        res.json({ success: true, message: 'Expense deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─────────────────────────────────────────
// GET /api/accounting/top-services
// Revenue by service type (top earners)
// ─────────────────────────────────────────
router.get('/top-services', (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT
                s.name AS service,
                COUNT(i.id) AS invoice_count,
                COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0) AS revenue
            FROM invoices i
            JOIN jobs j ON i.job_id = j.id
            JOIN services s ON j.service_id = s.id
            WHERE i.deleted_at IS NULL
            GROUP BY s.name
            ORDER BY revenue DESC
            LIMIT 5
        `).all();

        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
