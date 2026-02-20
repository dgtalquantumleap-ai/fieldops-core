const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/stats', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const todayJobs = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE job_date = ? AND deleted_at IS NULL").get(today);
        const pending = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'Scheduled' AND deleted_at IS NULL").get();
        const completed = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'Completed' AND deleted_at IS NULL").get();
        const revenue = db.prepare("SELECT SUM(amount) as sum FROM invoices WHERE LOWER(status) = 'paid' AND deleted_at IS NULL").get();

        res.json({
            todayJobs: todayJobs.count,
            pendingJobs: pending.count,
            completedJobs: completed.count,
            totalRevenue: revenue.sum || 0
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;