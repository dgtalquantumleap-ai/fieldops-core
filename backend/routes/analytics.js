const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ============================================
// ADVANCED ANALYTICS & BUSINESS INTELLIGENCE
// ============================================

/**
 * GET /api/analytics/dashboard
 * Get comprehensive dashboard analytics
 */
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const { period = '30', date_from, date_to } = req.query;
        
        // Date range calculation
        const dateFilter = date_from && date_to 
            ? `AND j.job_date BETWEEN '${date_from}' AND '${date_to}'`
            : `AND j.job_date >= date('now', '-${period} days')`;
        
        // Revenue analytics
        const revenueAnalytics = db.prepare(`
            SELECT 
                COUNT(*) as total_jobs,
                COUNT(CASE WHEN j.status = 'completed' THEN 1 END) as completed_jobs,
                SUM(CASE WHEN j.status = 'completed' THEN j.final_price ELSE 0 END) as total_revenue,
                AVG(CASE WHEN j.status = 'completed' THEN j.final_price ELSE NULL END) as avg_job_value,
                SUM(CASE WHEN j.status = 'completed' THEN j.final_price ELSE 0 END) / 
                COUNT(CASE WHEN j.status = 'completed' THEN 1 END) as revenue_per_completed_job
            FROM jobs j
            WHERE 1=1 ${dateFilter}
        `).get();
        
        // Customer analytics
        const customerAnalytics = db.prepare(`
            SELECT 
                COUNT(DISTINCT j.customer_id) as unique_customers,
                COUNT(*) as total_bookings,
                AVG(CASE WHEN j.status = 'completed' THEN 1 ELSE 0 END) as repeat_rate,
                COUNT(CASE WHEN j.created_at >= date('now', '-30 days') THEN 1 END) as new_customers
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            WHERE 1=1 ${dateFilter}
        `).get();
        
        // Staff performance analytics
        const staffAnalytics = db.prepare(`
            SELECT 
                COUNT(DISTINCT j.assigned_to) as active_staff,
                COUNT(*) as total_assignments,
                COUNT(CASE WHEN j.status = 'completed' THEN 1 END) as completed_assignments,
                AVG(j.estimated_duration) as avg_job_duration,
                COUNT(CASE WHEN j.status = 'in_progress' THEN 1 END) as active_jobs
            FROM jobs j
            WHERE j.assigned_to IS NOT NULL ${dateFilter}
        `).get();
        
        // Service performance
        const servicePerformance = db.prepare(`
            SELECT 
                s.name,
                COUNT(j.id) as bookings,
                COUNT(CASE WHEN j.status = 'completed' THEN 1 END) as completions,
                AVG(j.final_price) as avg_revenue,
                AVG(j.estimated_duration) as avg_duration,
                (COUNT(CASE WHEN j.status = 'completed' THEN 1 END) * 100.0 / COUNT(j.id)) as completion_rate
            FROM services s
            LEFT JOIN jobs j ON s.id = j.service_id
            WHERE s.is_active = 1 ${dateFilter.replace('j', 'j')}
            GROUP BY s.id
            ORDER BY bookings DESC
            LIMIT 10
        `).all();
        
        // Monthly trends
        const monthlyTrends = db.prepare(`
            SELECT 
                strftime('%Y-%m', job_date) as month,
                COUNT(*) as jobs,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
                SUM(final_price) as revenue,
                COUNT(DISTINCT customer_id) as unique_customers
            FROM jobs
            WHERE job_date >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', job_date)
            ORDER BY month DESC
        `).all();
        
        // Top performing staff
        const topStaff = db.prepare(`
            SELECT 
                st.name,
                COUNT(j.id) as jobs_completed,
                AVG(j.final_price) as avg_revenue,
                AVG(j.estimated_duration) as avg_duration,
                COUNT(CASE WHEN j.status = 'completed' THEN 1 END) * 100.0 / COUNT(j.id) as completion_rate
            FROM staff st
            JOIN jobs j ON st.id = j.assigned_to
            WHERE j.status = 'completed' ${dateFilter.replace('j', 'j')}
            GROUP BY st.id
            ORDER BY jobs_completed DESC
            LIMIT 5
        `).all();
        
        // Geographic distribution
        const geographicData = db.prepare(`
            SELECT 
                SUBSTR(j.location, 1, INSTR(j.location, ',')) as area,
                COUNT(*) as jobs,
                SUM(final_price) as revenue
            FROM jobs j
            WHERE j.status = 'completed' ${dateFilter}
            GROUP BY area
            ORDER BY jobs DESC
            LIMIT 10
        `).all();
        
        res.json({
            success: true,
            data: {
                revenue: revenueAnalytics,
                customers: customerAnalytics,
                staff: staffAnalytics,
                services: servicePerformance,
                trends: monthlyTrends,
                topStaff,
                geographic: geographicData,
                period: date_from && date_to ? `${date_from} to ${date_to}` : `Last ${period} days`
            }
        });
        
    } catch (error) {
        console.error('❌ Dashboard analytics error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/analytics/revenue
 * Get detailed revenue analytics
 */
router.get('/revenue', requireAuth, async (req, res) => {
    try {
        const { period = '30', group_by = 'day' } = req.query;
        
        let dateFormat;
        switch (group_by) {
            case 'hour':
                dateFormat = "strftime('%Y-%m-%d %H:00', job_date)";
                break;
            case 'week':
                dateFormat = "strftime('%Y-%W', job_date)";
                break;
            case 'month':
                dateFormat = "strftime('%Y-%m', job_date)";
                break;
            default:
                dateFormat = "strftime('%Y-%m-%d', job_date)";
        }
        
        const revenueData = db.prepare(`
            SELECT 
                ${dateFormat} as period,
                COUNT(*) as jobs,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
                SUM(final_price) as revenue,
                AVG(final_price) as avg_job_value,
                COUNT(DISTINCT customer_id) as unique_customers
            FROM jobs
            WHERE job_date >= date('now', '-${period} days')
            GROUP BY ${dateFormat}
            ORDER BY period DESC
        `).all();
        
        // Revenue by service
        const revenueByService = db.prepare(`
            SELECT 
                s.name,
                COUNT(j.id) as jobs,
                SUM(j.final_price) as revenue,
                AVG(j.final_price) as avg_revenue
            FROM services s
            JOIN jobs j ON s.id = j.service_id
            WHERE j.status = 'completed'
            AND j.job_date >= date('now', '-${period} days')
            GROUP BY s.id
            ORDER BY revenue DESC
        `).all();
        
        // Revenue by staff
        const revenueByStaff = db.prepare(`
            SELECT 
                st.name,
                COUNT(j.id) as jobs,
                SUM(j.final_price) as revenue,
                AVG(j.final_price) as avg_revenue
            FROM staff st
            JOIN jobs j ON st.id = j.assigned_to
            WHERE j.status = 'completed'
            AND j.job_date >= date('now', '-${period} days')
            GROUP BY st.id
            ORDER BY revenue DESC
        `).all();
        
        res.json({
            success: true,
            data: {
                timeline: revenueData,
                byService: revenueByService,
                byStaff: revenueByStaff,
                period: `Last ${period} days`
            }
        });
        
    } catch (error) {
        console.error('❌ Revenue analytics error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/analytics/customers
 * Get customer analytics and insights
 */
router.get('/customers', requireAuth, async (req, res) => {
    try {
        const { period = '90', segment = 'all' } = req.query;
        
        // Customer segments
        let segmentFilter = '';
        switch (segment) {
            case 'new':
                segmentFilter = 'AND c.created_at >= date(\'now\', \'-30 days\')';
                break;
            case 'repeat':
                segmentFilter = 'AND customer_bookings > 1';
                break;
            case 'high_value':
                segmentFilter = 'AND total_spent > 1000';
                break;
        }
        
        // Customer overview
        const customerOverview = db.prepare(`
            SELECT 
                COUNT(*) as total_customers,
                AVG(customer_bookings) as avg_bookings_per_customer,
                AVG(total_spent) as avg_spend_per_customer,
                COUNT(CASE WHEN customer_bookings > 1 THEN 1 END) as repeat_customers,
                COUNT(CASE WHEN total_spent > 1000 THEN 1 END) as high_value_customers
            FROM (
                SELECT 
                    c.id,
                    COUNT(j.id) as customer_bookings,
                    COALESCE(SUM(j.final_price), 0) as total_spent
                FROM customers c
                LEFT JOIN jobs j ON c.id = j.customer_id
                WHERE c.created_at >= date('now', '-${period} days')
                GROUP BY c.id
            ) customer_stats
            WHERE 1=1 ${segmentFilter}
        `).get();
        
        // Top customers
        const topCustomers = db.prepare(`
            SELECT 
                c.name,
                c.email,
                COUNT(j.id) as total_bookings,
                COALESCE(SUM(j.final_price), 0) as total_spent,
                AVG(j.final_price) as avg_booking_value,
                MAX(j.job_date) as last_booking
            FROM customers c
            LEFT JOIN jobs j ON c.id = j.customer_id
            WHERE c.created_at >= date('now', '-${period} days')
            GROUP BY c.id
            ORDER BY total_spent DESC
            LIMIT 20
        `).all();
        
        // Customer acquisition trends
        const acquisitionTrends = db.prepare(`
            SELECT 
                strftime('%Y-%m', created_at) as month,
                COUNT(*) as new_customers
            FROM customers
            WHERE created_at >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', created_at)
            ORDER BY month DESC
        `).all();
        
        // Customer retention
        const retentionData = db.prepare(`
            SELECT 
                strftime('%Y-%m', first_booking) as cohort_month,
                COUNT(*) as cohort_size,
                AVG(CASE WHEN bookings_in_month_2 > 0 THEN 1 ELSE 0 END) * 100 as month_2_retention,
                AVG(CASE WHEN bookings_in_month_3 > 0 THEN 1 ELSE 0 END) * 100 as month_3_retention
            FROM (
                SELECT 
                    c.id,
                    MIN(j.job_date) as first_booking,
                    COUNT(CASE WHEN j.job_date >= date(first_booking, '+1 month') AND j.job_date < date(first_booking, '+2 months') THEN 1 END) as bookings_in_month_2,
                    COUNT(CASE WHEN j.job_date >= date(first_booking, '+2 months') AND j.job_date < date(first_booking, '+3 months') THEN 1 END) as bookings_in_month_3
                FROM customers c
                JOIN jobs j ON c.id = j.customer_id
                WHERE c.created_at >= date('now', '-6 months')
                GROUP BY c.id
            ) cohorts
            GROUP BY cohort_month
            ORDER BY cohort_month DESC
        `).all();
        
        res.json({
            success: true,
            data: {
                overview: customerOverview,
                topCustomers,
                acquisition: acquisitionTrends,
                retention: retentionData,
                period: `Last ${period} days`
            }
        });
        
    } catch (error) {
        console.error('❌ Customer analytics error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/analytics/staff
 * Get staff performance analytics
 */
router.get('/staff', requireAuth, async (req, res) => {
    try {
        const { period = '30' } = req.query;
        
        // Staff performance overview
        const staffOverview = db.prepare(`
            SELECT 
                COUNT(*) as total_staff,
                COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_staff,
                AVG(total_jobs) as avg_jobs_per_staff,
                AVG(revenue_generated) as avg_revenue_per_staff,
                AVG(completion_rate) as avg_completion_rate
            FROM (
                SELECT 
                    st.id,
                    st.is_active,
                    COUNT(j.id) as total_jobs,
                    COALESCE(SUM(j.final_price), 0) as revenue_generated,
                    COUNT(CASE WHEN j.status = 'completed' THEN 1 END) * 100.0 / COUNT(j.id) as completion_rate
                FROM staff st
                LEFT JOIN jobs j ON st.id = j.assigned_to
                WHERE j.job_date >= date('now', '-${period} days') OR j.id IS NULL
                GROUP BY st.id
            ) staff_stats
        `).get();
        
        // Individual staff performance
        const staffPerformance = db.prepare(`
            SELECT 
                st.name,
                st.role,
                st.is_active,
                COUNT(j.id) as total_jobs,
                COUNT(CASE WHEN j.status = 'completed' THEN 1 END) as completed_jobs,
                COUNT(CASE WHEN j.status = 'in_progress' THEN 1 END) as active_jobs,
                COALESCE(SUM(j.final_price), 0) as revenue_generated,
                AVG(j.estimated_duration) as avg_job_duration,
                COUNT(CASE WHEN j.status = 'completed' THEN 1 END) * 100.0 / COUNT(j.id) as completion_rate
            FROM staff st
            LEFT JOIN jobs j ON st.id = j.assigned_to
            WHERE j.job_date >= date('now', '-${period} days') OR j.id IS NULL
            GROUP BY st.id
            ORDER BY revenue_generated DESC
        `).all();
        
        // Staff efficiency trends
        const efficiencyTrends = db.prepare(`
            SELECT 
                strftime('%Y-%m-%d', j.job_date) as date,
                st.name,
                COUNT(j.id) as jobs_completed,
                AVG(j.estimated_duration) as avg_duration,
                SUM(j.final_price) as daily_revenue
            FROM staff st
            JOIN jobs j ON st.id = j.assigned_to
            WHERE j.status = 'completed'
            AND j.job_date >= date('now', '-30 days')
            GROUP BY date, st.id
            ORDER BY date DESC
        `).all();
        
        // Service expertise matrix
        const expertiseMatrix = db.prepare(`
            SELECT 
                st.name,
                s.name as service_name,
                COUNT(j.id) as jobs_completed,
                AVG(j.final_price) as avg_revenue,
                AVG(j.estimated_duration) as avg_duration
            FROM staff st
            JOIN jobs j ON st.id = j.assigned_to
            JOIN services s ON j.service_id = s.id
            WHERE j.status = 'completed'
            AND j.job_date >= date('now', '-${period} days')
            GROUP BY st.id, s.id
            ORDER BY jobs_completed DESC
        `).all();
        
        res.json({
            success: true,
            data: {
                overview: staffOverview,
                performance: staffPerformance,
                trends: efficiencyTrends,
                expertise: expertiseMatrix,
                period: `Last ${period} days`
            }
        });
        
    } catch (error) {
        console.error('❌ Staff analytics error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/analytics/predictions
 * Get business predictions and forecasts
 */
router.get('/predictions', requireAuth, async (req, res) => {
    try {
        const { period = '30' } = req.query;
        
        // Revenue forecast based on trends
        const revenueForecast = db.prepare(`
            WITH daily_revenue AS (
                SELECT 
                    strftime('%Y-%m-%d', job_date) as date,
                    SUM(final_price) as revenue
                FROM jobs
                WHERE status = 'completed'
                AND job_date >= date('now', '-${period} days')
                GROUP BY strftime('%Y-%m-%d', job_date)
            ),
            trend_analysis AS (
                SELECT 
                    AVG(revenue) as avg_daily_revenue,
                    (MAX(revenue) - MIN(revenue)) as revenue_volatility,
                    COUNT(*) as data_points
                FROM daily_revenue
            )
            SELECT 
                avg_daily_revenue * 30 as monthly_forecast,
                revenue_volatility,
                CASE 
                    WHEN avg_daily_revenue > 0 THEN 'positive'
                    WHEN avg_daily_revenue < 0 THEN 'negative'
                    ELSE 'stable'
                END as trend_direction
            FROM trend_analysis
        `).get();
        
        // Staff capacity prediction
        const capacityPrediction = db.prepare(`
            SELECT 
                COUNT(*) as current_active_staff,
                COUNT(CASE WHEN is_active = 1 THEN 1 END) as available_staff,
                AVG(CASE WHEN j.status = 'completed' THEN j.estimated_duration ELSE 2 END) as avg_job_duration,
                COUNT(CASE WHEN j.status = 'in_progress' THEN 1 END) as current_workload
            FROM staff st
            LEFT JOIN jobs j ON st.id = j.assigned_to
            WHERE j.job_date >= date('now', '-7 days') OR j.id IS NULL
        `).get();
        
        // Service demand prediction
        const demandPrediction = db.prepare(`
            SELECT 
                s.name,
                COUNT(j.id) as recent_bookings,
                COUNT(CASE WHEN j.job_date >= date('now') AND j.job_date <= date('now', '+7 days') THEN 1 END) as upcoming_bookings,
                CASE 
                    WHEN COUNT(j.id) > AVG(COUNT(j.id)) OVER () THEN 'high'
                    WHEN COUNT(j.id) < AVG(COUNT(j.id)) OVER () * 0.5 THEN 'low'
                    ELSE 'medium'
                END as demand_level
            FROM services s
            LEFT JOIN jobs j ON s.id = j.service_id
            WHERE j.job_date >= date('now', '-30 days') OR j.id IS NULL
            GROUP BY s.id
            ORDER BY recent_bookings DESC
        `).all();
        
        // Customer churn prediction
        const churnPrediction = db.prepare(`
            WITH customer_activity AS (
                SELECT 
                    c.id,
                    c.name,
                    MAX(j.job_date) as last_booking,
                    COUNT(j.id) as total_bookings,
                    AVG(j.final_price) as avg_spend
                FROM customers c
                LEFT JOIN jobs j ON c.id = j.customer_id
                GROUP BY c.id
            )
            SELECT 
                COUNT(*) as total_customers,
                COUNT(CASE WHEN last_booking < date('now', '-90 days') THEN 1 END) as at_risk_customers,
                COUNT(CASE WHEN last_booking < date('now', '-180 days') THEN 1 END) as churned_customers,
                ROUND(COUNT(CASE WHEN last_booking < date('now', '-90 days') THEN 1 END) * 100.0 / COUNT(*), 2) as churn_risk_percentage
            FROM customer_activity
        `).get();
        
        res.json({
            success: true,
            data: {
                revenue: revenueForecast,
                capacity: capacityPrediction,
                demand: demandPrediction,
                churn: churnPrediction,
                generated_at: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Predictions analytics error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
