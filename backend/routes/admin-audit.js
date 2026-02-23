const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// ============================================
// AUDIT LOG MANAGEMENT
// ============================================

/**
 * GET /api/admin/audit-logs
 * Get comprehensive audit logs with filtering
 */
router.get('/audit-logs', requireAuth, async (req, res) => {
    try {
        const { page = 1, limit = 50, action, entity_type, user_id, date_from, date_to } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const conditions = [];
        const params = [];
        let idx = 1;

        if (action)      { conditions.push(`action = $${idx++}`);      params.push(action); }
        if (entity_type) { conditions.push(`entity_type = $${idx++}`); params.push(entity_type); }
        if (user_id)     { conditions.push(`user_id = $${idx++}`);     params.push(user_id); }
        if (date_from)   { conditions.push(`al.created_at >= $${idx++}`); params.push(date_from); }
        if (date_to)     { conditions.push(`al.created_at <= $${idx++}`); params.push(date_to); }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const logsQuery = `
            SELECT al.*, u.name as user_name, u.email as user_email, u.role as user_role
            FROM activity_log al
            LEFT JOIN users u ON al.user_id = u.id
            ${whereClause}
            ORDER BY al.created_at DESC
            LIMIT $${idx++} OFFSET $${idx++}
        `;

        const countQuery = `SELECT COUNT(*) as total FROM activity_log al ${whereClause}`;

        const summaryQuery = `
            SELECT action, entity_type, COUNT(*) as count, DATE(created_at) as date
            FROM activity_log al
            ${whereClause}
            GROUP BY action, entity_type, DATE(created_at)
            ORDER BY date DESC
            LIMIT 30
        `;

        const [logs, countResult, summary, actions, entityTypes, users] = await Promise.all([
            db.query(logsQuery, [...params, parseInt(limit), offset]),
            db.query(countQuery, params),
            db.query(summaryQuery, params),
            getDistinctActions(),
            getDistinctEntityTypes(),
            getDistinctUsers(),
        ]);

        const totalCount = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            data: {
                logs: logs.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / parseInt(limit))
                },
                summary: summary.rows,
                filters: { actions, entityTypes, users }
            }
        });

    } catch (error) {
        console.error('❌ Audit logs error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/audit-summary
 * Get audit summary statistics
 */
router.get('/audit-summary', requireAuth, async (req, res) => {
    try {
        const safeDays = Math.max(1, Math.min(365, parseInt(req.query.days) || 7));

        const [summary, overall, errors] = await Promise.all([
            db.query(`
                SELECT DATE(created_at) as date, action, entity_type, COUNT(*) as count, COUNT(DISTINCT user_id) as unique_users
                FROM activity_log
                WHERE created_at >= NOW() - INTERVAL '${safeDays} days'
                GROUP BY DATE(created_at), action, entity_type
                ORDER BY date DESC
            `),
            db.query(`
                SELECT COUNT(*) as total_actions, COUNT(DISTINCT user_id) as total_users, MAX(DATE(created_at)) as latest_date
                FROM activity_log
                WHERE created_at >= NOW() - INTERVAL '${safeDays} days'
            `),
            db.query(`
                SELECT action, COUNT(*) as error_count
                FROM activity_log
                WHERE created_at >= NOW() - INTERVAL '${safeDays} days'
                AND (action ILIKE '%error%' OR action ILIKE '%fail%')
                GROUP BY action
            `),
        ]);

        res.json({
            success: true,
            data: {
                summary: summary.rows,
                overall: overall.rows[0],
                errors: errors.rows,
                period: `Last ${safeDays} days`
            }
        });

    } catch (error) {
        console.error('❌ Audit summary error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/admin/audit-logs
 * Clear audit logs (admin only)
 */
router.delete('/audit-logs', requireAuth, async (req, res) => {
    try {
        const safeOlderThan = Math.max(1, Math.min(3650, parseInt(req.query.older_than_days) || 90));
        const { action, entity_type } = req.query;

        const conditions = [`created_at < NOW() - INTERVAL '${safeOlderThan} days'`];
        const params = [];
        let idx = 1;

        if (action)      { conditions.push(`action = $${idx++}`);      params.push(action); }
        if (entity_type) { conditions.push(`entity_type = $${idx++}`); params.push(entity_type); }

        const result = await db.query(
            `DELETE FROM activity_log WHERE ${conditions.join(' AND ')}`,
            params
        );

        console.log(`🗑️ Deleted ${result.rowCount} audit log entries`);
        res.json({ success: true, message: `Deleted ${result.rowCount} audit log entries` });

    } catch (error) {
        console.error('❌ Delete audit logs error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/system-health
 * Get system health metrics
 */
router.get('/system-health', requireAuth, async (_req, res) => {
    try {
        const [customers, jobs, staff, services, pendingJobs, activeJobs, recentActivity, errorRate] = await Promise.all([
            db.query('SELECT COUNT(*) as count FROM customers'),
            db.query('SELECT COUNT(*) as count FROM jobs'),
            db.query('SELECT COUNT(*) as count FROM users WHERE is_active = 1'),
            db.query('SELECT COUNT(*) as count FROM services WHERE is_active = 1'),
            db.query("SELECT COUNT(*) as count FROM jobs WHERE status = 'Scheduled'"),
            db.query("SELECT COUNT(*) as count FROM jobs WHERE status = 'In Progress'"),
            db.query("SELECT COUNT(*) as count FROM activity_log WHERE created_at >= NOW() - INTERVAL '1 hour'"),
            db.query(`
                SELECT COUNT(*) as total,
                    SUM(CASE WHEN action ILIKE '%error%' THEN 1 ELSE 0 END) as errors
                FROM activity_log
                WHERE created_at >= NOW() - INTERVAL '24 hours'
            `),
        ]);

        const er = errorRate.rows[0];
        const errorPercentage = er.total > 0 ? (parseFloat(er.errors) / parseFloat(er.total)) * 100 : 0;

        res.json({
            success: true,
            data: {
                database: {
                    totalCustomers: parseInt(customers.rows[0].count),
                    totalJobs: parseInt(jobs.rows[0].count),
                    totalStaff: parseInt(staff.rows[0].count),
                    totalServices: parseInt(services.rows[0].count),
                    pendingJobs: parseInt(pendingJobs.rows[0].count),
                    activeJobs: parseInt(activeJobs.rows[0].count),
                },
                activity: {
                    recentActions: parseInt(recentActivity.rows[0].count),
                    errorRate: Math.round(errorPercentage * 100) / 100
                },
                system: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    nodeVersion: process.version,
                    platform: process.platform
                },
                health: {
                    status: errorPercentage < 5 ? 'Healthy' : errorPercentage < 15 ? 'Warning' : 'Critical',
                    issues: errorPercentage > 15 ? ['High error rate'] : []
                }
            }
        });

    } catch (error) {
        console.error('❌ System health error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper functions (async)
async function getDistinctActions() {
    try {
        const { rows } = await db.query('SELECT DISTINCT action FROM activity_log ORDER BY action');
        return rows.map(r => r.action);
    } catch { return []; }
}

async function getDistinctEntityTypes() {
    try {
        const { rows } = await db.query('SELECT DISTINCT entity_type FROM activity_log ORDER BY entity_type');
        return rows.map(r => r.entity_type);
    } catch { return []; }
}

async function getDistinctUsers() {
    try {
        const { rows } = await db.query(`
            SELECT DISTINCT u.id, u.name, u.email, u.role
            FROM activity_log al
            JOIN users u ON al.user_id = u.id
            ORDER BY u.name
        `);
        return rows;
    } catch { return []; }
}

module.exports = router;
