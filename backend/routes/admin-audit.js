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
        const {
            page = 1,
            limit = 50,
            action,
            entity_type,
            user_id,
            date_from,
            date_to
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        // Build WHERE conditions
        let whereConditions = [];
        let params = [];
        
        if (action) {
            whereConditions.push('action = ?');
            params.push(action);
        }
        
        if (entity_type) {
            whereConditions.push('entity_type = ?');
            params.push(entity_type);
        }
        
        if (user_id) {
            whereConditions.push('user_id = ?');
            params.push(user_id);
        }
        
        if (date_from) {
            whereConditions.push('created_at >= ?');
            params.push(date_from);
        }
        
        if (date_to) {
            whereConditions.push('created_at <= ?');
            params.push(date_to);
        }
        
        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
        
        // Get audit logs with pagination
        const logsQuery = `
            SELECT 
                al.*,
                u.name as user_name,
                u.email as user_email,
                u.role as user_role
            FROM activity_log al
            LEFT JOIN users u ON al.user_id = u.id
            ${whereClause}
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const logs = db.prepare(logsQuery).all(...params, limit, offset);
        
        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM activity_log al
            ${whereClause}
        `;
        
        const totalCount = db.prepare(countQuery).get(...params).total;
        
        // Get summary statistics
        const summaryQuery = `
            SELECT 
                action,
                entity_type,
                COUNT(*) as count,
                DATE(created_at) as date
            FROM activity_log al
            ${whereClause}
            GROUP BY action, entity_type, DATE(created_at)
            ORDER BY date DESC
            LIMIT 30
        `;
        
        const summary = db.prepare(summaryQuery).all(...params);
        
        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                },
                summary: summary,
                filters: {
                    actions: getDistinctActions(),
                    entityTypes: getDistinctEntityTypes(),
                    users: getDistinctUsers()
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Audit logs error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/admin/audit-summary
 * Get audit summary statistics
 */
router.get('/audit-summary', requireAuth, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        
        const summaryQuery = `
            SELECT 
                DATE(created_at) as date,
                action,
                entity_type,
                COUNT(*) as count,
                COUNT(DISTINCT user_id) as unique_users
            FROM activity_log 
            WHERE created_at >= date('now', '-${days} days')
            GROUP BY DATE(created_at), action, entity_type
            ORDER BY date DESC
        `;
        
        const summary = db.prepare(summaryQuery).all();
        
        // Calculate overall stats
        const totalQuery = `
            SELECT 
                COUNT(*) as total_actions,
                COUNT(DISTINCT user_id) as total_users,
                DATE(created_at) as latest_date
            FROM activity_log 
            WHERE created_at >= date('now', '-${days} days')
        `;
        
        const overallStats = db.prepare(totalQuery).get();
        
        // Get error rates
        const errorQuery = `
            SELECT 
                action,
                COUNT(*) as error_count
            FROM activity_log 
            WHERE created_at >= date('now', '-${days} days')
            AND (action LIKE '%error%' OR action LIKE '%fail%')
            GROUP BY action
        `;
        
        const errors = db.prepare(errorQuery).all();
        
        res.json({
            success: true,
            data: {
                summary,
                overall: overallStats,
                errors,
                period: `Last ${days} days`
            }
        });
        
    } catch (error) {
        console.error('❌ Audit summary error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/admin/audit-logs
 * Clear audit logs (admin only)
 */
router.delete('/audit-logs', requireAuth, async (req, res) => {
    try {
        const { older_than_days = 90, action, entity_type } = req.query;
        
        let whereClause = 'WHERE created_at < date(\'now\', \'-? days\')';
        let params = [older_than_days];
        
        if (action) {
            whereClause += ' AND action = ?';
            params.push(action);
        }
        
        if (entity_type) {
            whereClause += ' AND entity_type = ?';
            params.push(entity_type);
        }
        
        const deleteQuery = `DELETE FROM activity_log ${whereClause}`;
        
        const result = db.prepare(deleteQuery).run(...params);
        
        console.log(`🗑️ Deleted ${result.changes} audit log entries`);
        
        res.json({
            success: true,
            message: `Deleted ${result.changes} audit log entries`
        });
        
    } catch (error) {
        console.error('❌ Delete audit logs error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/admin/system-health
 * Get system health metrics
 */
router.get('/system-health', requireAuth, async (req, res) => {
    try {
        // Database health
        const dbStats = {
            totalCustomers: db.prepare('SELECT COUNT(*) as count FROM customers').get().count,
            totalJobs: db.prepare('SELECT COUNT(*) as count FROM jobs').get().count,
            totalStaff: db.prepare('SELECT COUNT(*) as count FROM staff WHERE is_active = 1').get().count,
            totalServices: db.prepare('SELECT COUNT(*) as count FROM services WHERE is_active = 1').get().count,
            pendingJobs: db.prepare('SELECT COUNT(*) as count FROM jobs WHERE status = "Scheduled"').get().count,
            activeJobs: db.prepare('SELECT COUNT(*) as count FROM jobs WHERE status = "In Progress"').get().count
        };
        
        // Recent activity
        const recentActivity = db.prepare(`
            SELECT COUNT(*) as count 
            FROM activity_log 
            WHERE created_at >= datetime('now', '-1 hour')
        `).get().count;
        
        // Error rates
        const errorRate = db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN action LIKE '%error%' THEN 1 ELSE 0 END) as errors
            FROM activity_log 
            WHERE created_at >= date('now', '-24 hours')
        `).get();
        
        const errorPercentage = errorRate.total > 0 ? (errorRate.errors / errorRate.total) * 100 : 0;
        
        // System info
        const systemInfo = {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            nodeVersion: process.version,
            platform: process.platform
        };
        
        res.json({
            success: true,
            data: {
                database: dbStats,
                activity: {
                    recentActions: recentActivity,
                    errorRate: Math.round(errorPercentage * 100) / 100
                },
                system: systemInfo,
                health: {
                    status: errorPercentage < 5 ? 'Healthy' : errorPercentage < 15 ? 'Warning' : 'Critical',
                    issues: errorPercentage > 15 ? ['High error rate'] : []
                }
            }
        });
        
    } catch (error) {
        console.error('❌ System health error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper functions
function getDistinctActions() {
    try {
        const actions = db.prepare('SELECT DISTINCT action FROM activity_log ORDER BY action').all();
        return actions.map(row => row.action);
    } catch (error) {
        return [];
    }
}

function getDistinctEntityTypes() {
    try {
        const types = db.prepare('SELECT DISTINCT entity_type FROM activity_log ORDER BY entity_type').all();
        return types.map(row => row.entity_type);
    } catch (error) {
        return [];
    }
}

function getDistinctUsers() {
    try {
        const users = db.prepare(`
            SELECT DISTINCT u.id, u.name, u.email, u.role 
            FROM activity_log al
            JOIN users u ON al.user_id = u.id 
            ORDER BY u.name
        `).all();
        return users;
    } catch (error) {
        return [];
    }
}

module.exports = router;
