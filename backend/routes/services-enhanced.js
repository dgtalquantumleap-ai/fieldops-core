const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { emitRealTimeUpdate, logActivity } = require('../utils/realtime');

// ============================================
// ENHANCED SERVICE MANAGEMENT
// ============================================

/**
 * GET /api/services/enhanced
 * Get enhanced services with analytics
 */
router.get('/enhanced', requireAuth, async (req, res) => {
    try {
        const { date_from, date_to, include_analytics = 'true' } = req.query;
        
        // Get base services
        const services = db.prepare(`
            SELECT 
                s.*,
                COUNT(j.id) as total_jobs,
                COUNT(CASE WHEN j.status = 'completed' THEN 1 END) as completed_jobs,
                AVG(j.estimated_duration) as avg_duration,
                SUM(CASE WHEN j.status = 'completed' THEN COALESCE(j.final_price, s.price, 0) ELSE 0 END) as total_revenue,
                AVG(CASE WHEN j.status = 'completed' THEN COALESCE(j.final_price, s.price) ELSE NULL END) as avg_price
            FROM services s
            LEFT JOIN jobs j ON s.id = j.service_id
            WHERE s.is_active = 1
            GROUP BY s.id
            ORDER BY s.name
        `).all();
        
        // Add analytics if requested
        if (include_analytics === 'true') {
            for (const service of services) {
                // Get monthly trends
                const monthlyTrends = db.prepare(`
                    SELECT 
                        strftime('%Y-%m', job_date) as month,
                        COUNT(*) as jobs,
                        SUM(COALESCE(j2.final_price, s2.price, 0)) as revenue
                    FROM jobs j2
                    LEFT JOIN services s2 ON j2.service_id = s2.id
                    WHERE j2.service_id = ? 
                    AND j2.status = 'completed'
                    ${date_from ? `AND j2.job_date >= ?` : ''}
                    ${date_to ? `AND j2.job_date <= ?` : ''}
                    GROUP BY strftime('%Y-%m', j2.job_date)
                    ORDER BY month DESC
                    LIMIT 12
                `).all(
                    service.id,
                    ...(date_from ? [date_from] : []),
                    ...(date_to ? [date_to] : [])
                );
                
                // Get staff performance for this service
                const staffPerformance = db.prepare(`
                    SELECT 
                        st.name,
                        COUNT(j.id) as jobs_completed,
                        AVG(j.estimated_duration) as avg_duration,
                        AVG(COALESCE(j.final_price, s.price)) as avg_revenue
                    FROM jobs j
                    JOIN users st ON j.assigned_to = st.id
                    WHERE j.service_id = ? 
                    AND j.status = 'completed'
                    GROUP BY st.id
                    ORDER BY jobs_completed DESC
                `).all(service.id);
                
                // Get customer satisfaction (if ratings exist)
                const satisfaction = db.prepare(`
                    SELECT 
                        AVG(rating) as avg_rating,
                        COUNT(*) as total_ratings
                    FROM job_reviews jr
                    JOIN jobs j ON jr.job_id = j.id
                    WHERE j.service_id = ?
                `).get(service.id);
                
                service.analytics = {
                    monthlyTrends,
                    staffPerformance,
                    satisfaction: satisfaction || { avg_rating: 0, total_ratings: 0 },
                    completionRate: service.total_jobs > 0 ? (service.completed_jobs / service.total_jobs) * 100 : 0,
                    revenuePerJob: service.avg_price || 0
                };
            }
        }
        
        res.json({
            success: true,
            data: services
        });
        
    } catch (error) {
        console.error('❌ Enhanced services error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/services/enhanced
 * Create enhanced service with detailed configuration
 */
router.post('/enhanced', requireAdmin, async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            duration,
            category,
            difficulty_level,
            required_skills,
            equipment_needed,
            pricing_model,
            min_price,
            max_price,
            price_per_hour,
            tags,
            is_active = true
        } = req.body;
        
        // Validate required fields
        if (!name || !description || !price) {
            return res.status(400).json({
                success: false,
                error: 'Name, description, and base price are required'
            });
        }
        
        const now = new Date().toISOString();
        
        // Insert enhanced service
        const insertService = db.prepare(`
            INSERT INTO services (
                name, description, price, duration, category, 
                difficulty_level, required_skills, equipment_needed,
                pricing_model, min_price, max_price, price_per_hour,
                tags, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = insertService.run(
            name.trim(),
            description.trim(),
            parseFloat(price),
            parseInt(duration) || 2,
            category || 'General',
            difficulty_level || 'Medium',
            JSON.stringify(required_skills || []),
            JSON.stringify(equipment_needed || []),
            pricing_model || 'fixed',
            min_price ? parseFloat(min_price) : null,
            max_price ? parseFloat(max_price) : null,
            price_per_hour ? parseFloat(price_per_hour) : null,
            JSON.stringify(tags || []),
            is_active ? 1 : 0,
            now,
            now
        );
        
        const serviceId = result.lastInsertRowid;
        
        // Log activity
        logActivity(req.user.id, req.user.name, 'created', 'service', serviceId, name);
        
        // Get created service
        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
        
        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            emitRealTimeUpdate(io, 'service-created', { service }, 'admin');
        }
        
        res.status(201).json({
            success: true,
            message: 'Enhanced service created successfully',
            data: service
        });
        
    } catch (error) {
        console.error('❌ Create enhanced service error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/services/enhanced/:id
 * Update enhanced service
 */
router.put('/enhanced/:id', requireAdmin, async (req, res) => {
    try {
        const serviceId = req.params.id;
        const {
            name,
            description,
            price,
            duration,
            category,
            difficulty_level,
            required_skills,
            equipment_needed,
            pricing_model,
            min_price,
            max_price,
            price_per_hour,
            tags,
            is_active
        } = req.body;
        
        // Check if service exists
        const existingService = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
        if (!existingService) {
            return res.status(404).json({
                success: false,
                error: 'Service not found'
            });
        }
        
        const now = new Date().toISOString();
        
        // Update service
        const updateService = db.prepare(`
            UPDATE services SET
                name = ?, description = ?, price = ?, duration = ?, category = ?,
                difficulty_level = ?, required_skills = ?, equipment_needed = ?,
                pricing_model = ?, min_price = ?, max_price = ?, price_per_hour = ?,
                tags = ?, is_active = ?, updated_at = ?
            WHERE id = ?
        `);
        
        updateService.run(
            name?.trim() || existingService.name,
            description?.trim() || existingService.description,
            price !== undefined ? parseFloat(price) : existingService.price,
            duration !== undefined ? parseInt(duration) : existingService.duration,
            category || existingService.category,
            difficulty_level || existingService.difficulty_level,
            required_skills !== undefined ? JSON.stringify(required_skills) : existingService.required_skills,
            equipment_needed !== undefined ? JSON.stringify(equipment_needed) : existingService.equipment_needed,
            pricing_model || existingService.pricing_model,
            min_price !== undefined ? (min_price ? parseFloat(min_price) : null) : existingService.min_price,
            max_price !== undefined ? (max_price ? parseFloat(max_price) : null) : existingService.max_price,
            price_per_hour !== undefined ? (price_per_hour ? parseFloat(price_per_hour) : null) : existingService.price_per_hour,
            tags !== undefined ? JSON.stringify(tags) : existingService.tags,
            is_active !== undefined ? (is_active ? 1 : 0) : existingService.is_active,
            now,
            serviceId
        );
        
        // Log activity
        logActivity(req.user.id, req.user.name, 'updated', 'service', serviceId, name || existingService.name);
        
        // Get updated service
        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
        
        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            emitRealTimeUpdate(io, 'service-updated', { service }, 'admin');
        }
        
        res.json({
            success: true,
            message: 'Service updated successfully',
            data: service
        });
        
    } catch (error) {
        console.error('❌ Update enhanced service error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/services/analytics
 * Get comprehensive service analytics
 */
router.get('/analytics', requireAuth, async (req, res) => {
    try {
        const { period = '30', service_id } = req.query;
        const safePeriod = Math.max(1, Math.min(365, parseInt(period) || 30));
        const safeServiceId = service_id ? parseInt(service_id) || null : null;

        // Revenue trends
        const revenueTrends = db.prepare(`
            SELECT
                strftime('%Y-%m-%d', j.job_date) as date,
                s.name as service_name,
                COUNT(*) as jobs,
                SUM(COALESCE(j.final_price, s.price, 0)) as revenue
            FROM jobs j
            JOIN services s ON j.service_id = s.id
            WHERE j.status = 'completed'
            AND j.job_date >= date('now', '-${safePeriod} days')
            ${safeServiceId ? 'AND j.service_id = ?' : ''}
            GROUP BY date, s.id
            ORDER BY date DESC
        `).all(...(safeServiceId ? [safeServiceId] : []));

        // Service performance comparison
        const serviceComparison = db.prepare(`
            SELECT
                s.name,
                COUNT(j.id) as total_jobs,
                COUNT(CASE WHEN j.status = 'completed' THEN 1 END) as completed_jobs,
                AVG(COALESCE(j.final_price, s.price)) as avg_revenue,
                AVG(j.estimated_duration) as avg_duration,
                COUNT(DISTINCT j.assigned_to) as unique_staff
            FROM services s
            LEFT JOIN jobs j ON s.id = j.service_id
            WHERE s.is_active = 1
            AND (j.job_date >= date('now', '-${safePeriod} days') OR j.id IS NULL)
            GROUP BY s.id
            ORDER BY total_jobs DESC
        `).all();

        // Popular services
        const popularServices = db.prepare(`
            SELECT
                s.name,
                COUNT(j.id) as bookings,
                COUNT(CASE WHEN j.status = 'completed' THEN 1 END) as completions,
                AVG(COALESCE(j.final_price, s.price)) as avg_revenue
            FROM services s
            JOIN jobs j ON s.id = j.service_id
            WHERE j.job_date >= date('now', '-${safePeriod} days')
            GROUP BY s.id
            ORDER BY bookings DESC
            LIMIT 10
        `).all();

        // Staff service expertise
        const staffExpertise = db.prepare(`
            SELECT
                st.name as staff_name,
                s.name as service_name,
                COUNT(j.id) as jobs_completed,
                AVG(COALESCE(j.final_price, s.price)) as avg_revenue,
                AVG(j.estimated_duration) as avg_duration
            FROM users st
            JOIN jobs j ON st.id = j.assigned_to
            JOIN services s ON j.service_id = s.id
            WHERE j.status = 'completed'
            AND j.job_date >= date('now', '-${safePeriod} days')
            GROUP BY st.id, s.id
            ORDER BY jobs_completed DESC
        `).all();
        
        res.json({
            success: true,
            data: {
                revenueTrends,
                serviceComparison,
                popularServices,
                staffExpertise,
                period: `${period} days`
            }
        });
        
    } catch (error) {
        console.error('❌ Service analytics error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/services/:id/duplicate
 * Duplicate a service configuration
 */
router.post('/:id/duplicate', requireAdmin, async (req, res) => {
    try {
        const serviceId = req.params.id;
        const { name_suffix = ' (Copy)' } = req.body;
        
        // Get original service
        const originalService = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
        if (!originalService) {
            return res.status(404).json({
                success: false,
                error: 'Service not found'
            });
        }
        
        const now = new Date().toISOString();
        
        // Create duplicate
        const insertDuplicate = db.prepare(`
            INSERT INTO services (
                name, description, price, duration, category,
                difficulty_level, required_skills, equipment_needed,
                pricing_model, min_price, max_price, price_per_hour,
                tags, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = insertDuplicate.run(
            originalService.name + name_suffix,
            originalService.description,
            originalService.price,
            originalService.duration,
            originalService.category,
            originalService.difficulty_level,
            originalService.required_skills,
            originalService.equipment_needed,
            originalService.pricing_model,
            originalService.min_price,
            originalService.max_price,
            originalService.price_per_hour,
            originalService.tags,
            0, // Start as inactive
            now,
            now
        );
        
        // Log activity
        logActivity(req.user.id, req.user.name, 'duplicated', 'service', result.lastInsertRowid, originalService.name);
        
        // Get duplicated service
        const duplicatedService = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
        
        res.status(201).json({
            success: true,
            message: 'Service duplicated successfully',
            data: duplicatedService
        });
        
    } catch (error) {
        console.error('❌ Duplicate service error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
