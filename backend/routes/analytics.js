const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');

router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const { period = '30', date_from, date_to } = req.query;
        const safePeriod = Math.max(1, Math.min(365, parseInt(period) || 30));
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const safeDateFrom = date_from && dateRegex.test(date_from) ? date_from : null;
        const safeDateTo   = date_to   && dateRegex.test(date_to)   ? date_to   : null;

        const dateFilter = safeDateFrom && safeDateTo
            ? `AND j.job_date BETWEEN '${safeDateFrom}' AND '${safeDateTo}'`
            : `AND j.job_date >= (NOW() - INTERVAL '${safePeriod} days')::DATE::TEXT`;

        const [revenueRes, customerRes, staffRes, serviceRes, trendRes, topStaffRes, geoRes] = await Promise.all([
            db.query(`
                SELECT COUNT(*) as total_jobs,
                    COUNT(CASE WHEN j.status='completed' THEN 1 END) as completed_jobs,
                    SUM(CASE WHEN j.status='completed' THEN COALESCE(j.final_price,s.price,0) ELSE 0 END) as total_revenue,
                    AVG(CASE WHEN j.status='completed' THEN COALESCE(j.final_price,s.price) END) as avg_job_value
                FROM jobs j LEFT JOIN services s ON j.service_id=s.id WHERE 1=1 ${dateFilter}`),
            db.query(`
                SELECT COUNT(DISTINCT j.customer_id) as unique_customers, COUNT(*) as total_bookings,
                    AVG(CASE WHEN j.status='completed' THEN 1 ELSE 0 END) as repeat_rate
                FROM jobs j LEFT JOIN customers c ON j.customer_id=c.id WHERE 1=1 ${dateFilter}`),
            db.query(`
                SELECT COUNT(DISTINCT j.assigned_to) as active_staff, COUNT(*) as total_assignments,
                    COUNT(CASE WHEN j.status='completed' THEN 1 END) as completed_assignments,
                    AVG(j.estimated_duration) as avg_job_duration
                FROM jobs j WHERE j.assigned_to IS NOT NULL ${dateFilter}`),
            db.query(`
                SELECT s.name, COUNT(j.id) as bookings, COUNT(CASE WHEN j.status='completed' THEN 1 END) as completions,
                    AVG(COALESCE(j.final_price,s.price)) as avg_revenue
                FROM services s LEFT JOIN jobs j ON s.id=j.service_id
                WHERE s.is_active=1 ${dateFilter} GROUP BY s.id ORDER BY bookings DESC LIMIT 10`),
            db.query(`
                SELECT TO_CHAR(j.job_date::DATE,'YYYY-MM') as month, COUNT(*) as jobs,
                    COUNT(CASE WHEN j.status='completed' THEN 1 END) as completed_jobs,
                    SUM(COALESCE(j.final_price,s.price,0)) as revenue,
                    COUNT(DISTINCT j.customer_id) as unique_customers
                FROM jobs j LEFT JOIN services s ON j.service_id=s.id
                WHERE j.job_date >= (NOW()-INTERVAL '12 months')::DATE::TEXT
                GROUP BY TO_CHAR(j.job_date::DATE,'YYYY-MM') ORDER BY month DESC`),
            db.query(`
                SELECT st.name, COUNT(j.id) as jobs_completed,
                    AVG(COALESCE(j.final_price,s.price,0)) as avg_revenue
                FROM users st JOIN jobs j ON st.id=j.assigned_to LEFT JOIN services s ON j.service_id=s.id
                WHERE j.status='completed' ${dateFilter} GROUP BY st.id ORDER BY jobs_completed DESC LIMIT 5`),
            db.query(`
                SELECT SPLIT_PART(j.location,',',1) as area, COUNT(*) as jobs,
                    SUM(COALESCE(j.final_price,s.price,0)) as revenue
                FROM jobs j LEFT JOIN services s ON j.service_id=s.id
                WHERE j.status='completed' ${dateFilter}
                GROUP BY SPLIT_PART(j.location,',',1) ORDER BY jobs DESC LIMIT 10`),
        ]);

        res.json({ success: true, data: {
            revenue: revenueRes.rows[0], customers: customerRes.rows[0], staff: staffRes.rows[0],
            services: serviceRes.rows, trends: trendRes.rows, topStaff: topStaffRes.rows,
            geographic: geoRes.rows, period: safeDateFrom && safeDateTo ? `${safeDateFrom} to ${safeDateTo}` : `Last ${safePeriod} days`
        }});
    } catch (error) {
        console.error('❌ Dashboard analytics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/revenue', requireAuth, async (req, res) => {
    try {
        const { period = '30', group_by = 'day' } = req.query;
        const safePeriod = Math.max(1, Math.min(365, parseInt(period) || 30));
        const allowedFormats = ['hour','week','month','day'];
        const safeGroupBy = allowedFormats.includes(group_by) ? group_by : 'day';

        let dateFormat;
        switch (safeGroupBy) {
            case 'hour':  dateFormat = "TO_CHAR(job_date::TIMESTAMP,'YYYY-MM-DD HH24:00')"; break;
            case 'week':  dateFormat = "TO_CHAR(job_date::DATE,'IYYY-IW')"; break;
            case 'month': dateFormat = "TO_CHAR(job_date::DATE,'YYYY-MM')"; break;
            default:      dateFormat = "TO_CHAR(job_date::DATE,'YYYY-MM-DD')";
        }

        const [timelineRes, byServiceRes, byStaffRes] = await Promise.all([
            db.query(`
                SELECT ${dateFormat} as period, COUNT(*) as jobs,
                    COUNT(CASE WHEN j.status='completed' THEN 1 END) as completed_jobs,
                    SUM(COALESCE(j.final_price,s.price,0)) as revenue,
                    AVG(COALESCE(j.final_price,s.price)) as avg_job_value,
                    COUNT(DISTINCT j.customer_id) as unique_customers
                FROM jobs j LEFT JOIN services s ON j.service_id=s.id
                WHERE j.job_date >= (NOW()-INTERVAL '${safePeriod} days')::DATE::TEXT
                GROUP BY ${dateFormat} ORDER BY period DESC`),
            db.query(`
                SELECT s.name, COUNT(j.id) as jobs, SUM(COALESCE(j.final_price,s.price,0)) as revenue,
                    AVG(COALESCE(j.final_price,s.price)) as avg_revenue
                FROM services s JOIN jobs j ON s.id=j.service_id
                WHERE j.status='completed'
                AND j.job_date >= (NOW()-INTERVAL '${safePeriod} days')::DATE::TEXT
                GROUP BY s.id ORDER BY revenue DESC`),
            db.query(`
                SELECT st.name, COUNT(j.id) as jobs, SUM(COALESCE(j.final_price,s.price,0)) as revenue,
                    AVG(COALESCE(j.final_price,s.price)) as avg_revenue
                FROM users st JOIN jobs j ON st.id=j.assigned_to LEFT JOIN services s ON j.service_id=s.id
                WHERE j.status='completed'
                AND j.job_date >= (NOW()-INTERVAL '${safePeriod} days')::DATE::TEXT
                GROUP BY st.id ORDER BY revenue DESC`),
        ]);

        res.json({ success: true, data: { timeline: timelineRes.rows, byService: byServiceRes.rows, byStaff: byStaffRes.rows, period: `Last ${safePeriod} days` }});
    } catch (error) {
        console.error('❌ Revenue analytics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/customers', requireAuth, async (req, res) => {
    try {
        const { period = '90' } = req.query;
        const safePeriod = Math.max(1, Math.min(730, parseInt(period) || 90));

        const [overviewRes, topRes, acquisitionRes] = await Promise.all([
            db.query(`
                SELECT COUNT(*) as total_customers,
                    AVG(customer_bookings) as avg_bookings_per_customer,
                    AVG(total_spent) as avg_spend_per_customer,
                    COUNT(CASE WHEN customer_bookings>1 THEN 1 END) as repeat_customers
                FROM (
                    SELECT c.id, COUNT(j.id) as customer_bookings,
                        COALESCE(SUM(COALESCE(j.final_price,s.price,0)),0) as total_spent
                    FROM customers c
                    LEFT JOIN jobs j ON c.id=j.customer_id
                    LEFT JOIN services s ON j.service_id=s.id
                    WHERE c.created_at >= NOW()-INTERVAL '${safePeriod} days'
                    GROUP BY c.id
                ) customer_stats`),
            db.query(`
                SELECT c.name, c.email, COUNT(j.id) as total_bookings,
                    COALESCE(SUM(COALESCE(j.final_price,s.price,0)),0) as total_spent,
                    MAX(j.job_date) as last_booking
                FROM customers c
                LEFT JOIN jobs j ON c.id=j.customer_id
                LEFT JOIN services s ON j.service_id=s.id
                WHERE c.created_at >= NOW()-INTERVAL '${safePeriod} days'
                GROUP BY c.id ORDER BY total_spent DESC LIMIT 20`),
            db.query(`
                SELECT TO_CHAR(created_at,'YYYY-MM') as month, COUNT(*) as new_customers
                FROM customers WHERE created_at >= NOW()-INTERVAL '12 months'
                GROUP BY TO_CHAR(created_at,'YYYY-MM') ORDER BY month DESC`),
        ]);

        res.json({ success: true, data: { overview: overviewRes.rows[0], topCustomers: topRes.rows, acquisition: acquisitionRes.rows, period: `Last ${safePeriod} days` }});
    } catch (error) {
        console.error('❌ Customer analytics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/staff', requireAuth, async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const safePeriod = Math.max(1, Math.min(365, parseInt(period) || 30));

        const [overviewRes, perfRes, trendsRes] = await Promise.all([
            db.query(`
                SELECT COUNT(*) as total_staff, COUNT(CASE WHEN is_active=1 THEN 1 END) as active_staff
                FROM users`),
            db.query(`
                SELECT st.name, st.role, st.is_active,
                    COUNT(j.id) as total_jobs,
                    COUNT(CASE WHEN j.status='completed' THEN 1 END) as completed_jobs,
                    COALESCE(SUM(COALESCE(j.final_price,s.price,0)),0) as revenue_generated,
                    AVG(j.estimated_duration) as avg_job_duration,
                    COUNT(CASE WHEN j.status='completed' THEN 1 END)*100.0/NULLIF(COUNT(j.id),0) as completion_rate
                FROM users st
                LEFT JOIN jobs j ON st.id=j.assigned_to
                LEFT JOIN services s ON j.service_id=s.id
                WHERE j.job_date >= (NOW()-INTERVAL '${safePeriod} days')::DATE::TEXT OR j.id IS NULL
                GROUP BY st.id ORDER BY revenue_generated DESC`),
            db.query(`
                SELECT TO_CHAR(j.job_date::DATE,'YYYY-MM-DD') as date, st.name,
                    COUNT(j.id) as jobs_completed, SUM(COALESCE(j.final_price,s.price,0)) as daily_revenue
                FROM users st JOIN jobs j ON st.id=j.assigned_to LEFT JOIN services s ON j.service_id=s.id
                WHERE j.status='completed' AND j.job_date >= (NOW()-INTERVAL '30 days')::DATE::TEXT
                GROUP BY TO_CHAR(j.job_date::DATE,'YYYY-MM-DD'), st.id ORDER BY date DESC`),
        ]);

        res.json({ success: true, data: { overview: overviewRes.rows[0], performance: perfRes.rows, trends: trendsRes.rows, period: `Last ${safePeriod} days` }});
    } catch (error) {
        console.error('❌ Staff analytics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/predictions', requireAuth, async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const safePeriod = Math.max(1, Math.min(365, parseInt(period) || 30));

        const [forecastRes, capacityRes, demandRes, churnRes] = await Promise.all([
            db.query(`
                WITH daily AS (
                    SELECT TO_CHAR(j.job_date::DATE,'YYYY-MM-DD') as date,
                        SUM(COALESCE(j.final_price,s.price,0)) as revenue
                    FROM jobs j LEFT JOIN services s ON j.service_id=s.id
                    WHERE j.status='completed'
                    AND j.job_date >= (NOW()-INTERVAL '${safePeriod} days')::DATE::TEXT
                    GROUP BY TO_CHAR(j.job_date::DATE,'YYYY-MM-DD')
                )
                SELECT AVG(revenue)*30 as monthly_forecast,
                    MAX(revenue)-MIN(revenue) as revenue_volatility
                FROM daily`),
            db.query(`
                SELECT COUNT(*) as current_active_staff,
                    COUNT(CASE WHEN is_active=1 THEN 1 END) as available_staff
                FROM users`),
            db.query(`
                SELECT s.name, COUNT(j.id) as recent_bookings,
                    COUNT(CASE WHEN j.job_date >= NOW()::DATE::TEXT AND j.job_date <= (NOW()+INTERVAL '7 days')::DATE::TEXT THEN 1 END) as upcoming_bookings
                FROM services s LEFT JOIN jobs j ON s.id=j.service_id
                WHERE j.job_date >= (NOW()-INTERVAL '30 days')::DATE::TEXT OR j.id IS NULL
                GROUP BY s.id ORDER BY recent_bookings DESC`),
            db.query(`
                WITH activity AS (
                    SELECT c.id, MAX(j.job_date) as last_booking, COUNT(j.id) as total_bookings
                    FROM customers c LEFT JOIN jobs j ON c.id=j.customer_id GROUP BY c.id
                )
                SELECT COUNT(*) as total_customers,
                    COUNT(CASE WHEN last_booking < (NOW()-INTERVAL '90 days')::DATE::TEXT THEN 1 END) as at_risk_customers,
                    COUNT(CASE WHEN last_booking < (NOW()-INTERVAL '180 days')::DATE::TEXT THEN 1 END) as churned_customers
                FROM activity`),
        ]);

        res.json({ success: true, data: { revenue: forecastRes.rows[0], capacity: capacityRes.rows[0], demand: demandRes.rows, churn: churnRes.rows[0], generated_at: new Date().toISOString() }});
    } catch (error) {
        console.error('❌ Predictions error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
