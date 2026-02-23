const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/stats', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const [todayJobs, pending, completed, revenue] = await Promise.all([
            db.query('SELECT COUNT(*) as count FROM jobs WHERE job_date = $1 AND deleted_at IS NULL', [today]),
            db.query("SELECT COUNT(*) as count FROM jobs WHERE status = 'Scheduled' AND deleted_at IS NULL"),
            db.query("SELECT COUNT(*) as count FROM jobs WHERE status = 'Completed' AND deleted_at IS NULL"),
            db.query("SELECT SUM(amount) as sum FROM invoices WHERE LOWER(status) = 'paid' AND deleted_at IS NULL"),
        ]);

        res.json({
            todayJobs:     parseInt(todayJobs.rows[0].count),
            pendingJobs:   parseInt(pending.rows[0].count),
            completedJobs: parseInt(completed.rows[0].count),
            totalRevenue:  parseFloat(revenue.rows[0].sum) || 0
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
