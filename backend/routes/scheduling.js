const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { emitRealTimeUpdate, logActivity, triggerAutomations } = require('../utils/realtime');
const { validateBooking } = require('../middleware/validate');

// ============================================
// SCHEDULING LAYER - Time Slot & Staff Management
// ============================================

/**
 * Validate time slot availability
 * Checks if time slot is available for specific date/time
 */
function validateTimeSlot(date, time, duration = 2) {
    try {
        // Parse time and calculate end time
        const [hours, minutes] = time.split(':').map(Number);
        const startTime = new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
        const endTime = new Date(startTime.getTime() + (duration * 60 * 60 * 1000));
        
        // Check for existing jobs in this time slot (simplified approach)
        const conflictingJobs = db.prepare(`
            SELECT * FROM jobs 
            WHERE job_date = ? 
            AND status NOT IN ('Cancelled', 'completed')
            AND job_time = ?
        `).all(date, time);
        
        if (conflictingJobs.length > 0) {
            return {
                available: false,
                conflicts: conflictingJobs.map(job => ({
                    jobId: job.id,
                    time: job.job_time,
                    duration: job.estimated_duration || 2,
                    staff: job.assigned_to
                }))
            };
        }
        
        return { available: true };
    } catch (error) {
        console.error('Time slot validation error:', error);
        return { available: false, error: error.message };
    }
}

/**
 * Check staff availability for time slot
 */
function checkStaffAvailability(staffId, date, time, duration = 2) {
    try {
        const [hours, minutes] = time.split(':').map(Number);
        const startTime = new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
        const endTime = new Date(startTime.getTime() + (duration * 60 * 60 * 1000));
        
        // Check staff's existing jobs
        const staffJobs = db.prepare(`
            SELECT * FROM jobs 
            WHERE assigned_to = ? 
            AND job_date = ? 
            AND status NOT IN ('Cancelled', 'completed')
            AND (
                (job_time <= ? AND ADD_TIME(job_time, '02:00') > ?) OR
                (job_time < ? AND ADD_TIME(job_time, '02:00') >= ?)
            )
        `).all(staffId, date, time, time, endTime);
        
        return {
            available: staffJobs.length === 0,
            existingJobs: staffJobs
        };
    } catch (error) {
        console.error('Staff availability check error:', error);
        return { available: false, error: error.message };
    }
}

/**
 * Get optimal staff assignment using AI-based logic
 */
function getOptimalStaffAssignment(serviceId, date, time) {
    try {
        // Get all active staff
        const activeStaff = db.prepare(`
            SELECT s.*, 
                   COUNT(j.id) as current_jobs,
                   MAX(j.created_at) as last_job_date
            FROM staff s
            LEFT JOIN jobs j ON s.id = j.assigned_to 
                AND j.job_date >= date('now', '-7 days')
                AND j.status NOT IN ('Cancelled', 'completed')
            WHERE s.is_active = 1
            GROUP BY s.id
        `).all();
        
        console.log(' Found active staff:', activeStaff.length);
        
        if (activeStaff.length === 0) {
            return { 
                error: 'No active staff available',
                alternatives: ['Please contact admin to add staff members']
            };
        }
        
        // Get service requirements
        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
        if (!service) {
            throw new Error('Service not found');
        }
        
        // For now, just return the first available staff member
        // (simplified assignment logic)
        const availableStaff = activeStaff.filter(staff => {
            const availability = checkStaffAvailability(staff.id, date, time);
            return availability.available;
        });
        
        if (availableStaff.length === 0) {
            return { 
                error: 'No staff available for this time slot',
                alternatives: activeStaff.map(s => s.name)
            };
        }
        
        // Return the first available staff member
        return {
            recommended: availableStaff[0],
            alternatives: availableStaff.slice(1),
            totalAvailable: availableStaff.length
        };
    } catch (error) {
        console.error('Staff assignment error:', error);
        return { error: error.message };
    }
}

// ============================================
// SCHEDULING ENDPOINTS
// ============================================

/**
 * POST /api/scheduling/validate
 * Validate booking request against scheduling rules
 */
router.post('/validate', validateBooking, async (req, res) => {
    try {
        const { customer_id, name, phone, email, address, service, date, time, notes } = req.body;
        
        console.log('🕐 Scheduling validation request:', { customer_id, name, service, date, time });
        
        // ============================================
        // TIME SLOT VALIDATION
        // ============================================
        
        const timeSlotValidation = validateTimeSlot(date, time);
        if (!timeSlotValidation.available) {
            return res.status(409).json({
                success: false,
                error: 'Time slot not available',
                code: 'TIME_SLOT_UNAVAILABLE',
                details: timeSlotValidation.conflicts || [],
                message: 'Selected time slot is already booked'
            });
        }
        
        // ============================================
        // SERVICE AVAILABILITY
        // ============================================
        
        const serviceRecord = db.prepare('SELECT * FROM services WHERE name = ? AND is_active = 1').get(service);
        if (!serviceRecord) {
            return res.status(400).json({
                success: false,
                error: 'Service not available',
                code: 'SERVICE_UNAVAILABLE',
                message: `The service "${service}" is currently unavailable`
            });
        }
        
        // ============================================
        // STAFF AVAILABILITY CHECK
        // ============================================
        
        const staffAssignment = getOptimalStaffAssignment(serviceRecord.id, date, time);
        if (staffAssignment.error) {
            return res.status(500).json({
                success: false,
                error: 'Staff assignment failed',
                code: 'STAFF_ASSIGNMENT_ERROR',
                message: staffAssignment.error
            });
        }
        
        if (!staffAssignment.recommended) {
            return res.status(409).json({
                success: false,
                error: 'No available staff',
                code: 'NO_STAFF_AVAILABLE',
                message: 'No staff members are available for the selected time slot',
                alternatives: staffAssignment.alternatives
            });
        }
        
        // ============================================
        // CAPACITY CHECKING
        // ============================================
        
        const totalActiveStaff = db.prepare('SELECT COUNT(*) as count FROM staff WHERE is_active = 1').get();
        const concurrentJobs = db.prepare(`
            SELECT COUNT(*) as count FROM jobs 
            WHERE job_date = ? AND status IN ('Scheduled', 'In Progress')
        `).get(date);
        
        const capacityUtilization = (concurrentJobs.count / totalActiveStaff.count) * 100;
        
        if (capacityUtilization > 90) {
            return res.status(409).json({
                success: false,
                error: 'High capacity utilization',
                code: 'CAPACITY_FULL',
                message: 'Service is at maximum capacity. Please choose a different time.',
                utilization: capacityUtilization
            });
        }
        
        // ============================================
        // SCHEDULING CONFIRMATION
        // ============================================
        
        const schedulingConfirmation = {
            valid: true,
            timeSlot: timeSlotValidation,
            service: serviceRecord,
            recommendedStaff: staffAssignment.recommended,
            alternatives: staffAssignment.alternatives,
            capacity: {
                utilization: capacityUtilization,
                available: totalActiveStaff.count - concurrentJobs.count
            },
            estimatedDuration: serviceRecord.duration || 2,
            pricing: serviceRecord.price
        };
        
        console.log('✅ Scheduling validation passed:', {
            recommendedStaff: staffAssignment.recommended.name,
            alternatives: staffAssignment.alternatives.length
        });
        
        res.status(200).json({
            success: true,
            message: 'Time slot available for booking',
            data: schedulingConfirmation
        });
        
    } catch (error) {
        console.error('❌ Scheduling validation error:', error);
        res.status(500).json({
            success: false,
            error: 'Scheduling validation failed',
            code: 'SCHEDULING_ERROR',
            message: error.message
        });
    }
});

/**
 * GET /api/scheduling/staff-availability
 * Get staff availability for specific date/time
 */
router.get('/staff-availability', async (req, res) => {
    try {
        const { date, service_id } = req.query;
        
        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'Date is required'
            });
        }
        
        // Get all active staff with their availability
        const activeStaff = db.prepare(`
            SELECT s.*, j.id as current_job_id
            FROM staff s
            LEFT JOIN jobs j ON s.id = j.assigned_to 
                AND j.job_date = ? AND j.status IN ('Scheduled', 'In Progress')
            WHERE s.is_active = 1
            ORDER BY s.name
        `).all(date);
        
        const staffWithAvailability = activeStaff.map(staff => {
            const availability = checkStaffAvailability(staff.id, date, '09:00'); // Check from 9 AM
            return {
                ...staff,
                available: availability.available,
                currentJob: staff.current_job_id,
                existingJobs: availability.existingJobs || []
            };
        });
        
        res.json({
            success: true,
            data: staffWithAvailability
        });
        
    } catch (error) {
        console.error('❌ Staff availability check error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/scheduling/confirm-booking
 * Confirm booking after scheduling validation
 */
router.post('/confirm-booking', validateBooking, async (req, res) => {
    try {
        const { 
            customer_id, 
            service_id, 
            date, 
            time, 
            address, 
            notes, 
            staff_id,
            estimated_duration 
        } = req.body;
        
        console.log('🎯 Confirming booking with staff assignment:', { customer_id, staff_id, date, time });
        
        // ============================================
        // FINAL VALIDATIONS
        // ============================================
        
        // Verify customer exists
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
        if (!customer) {
            return res.status(400).json({
                success: false,
                error: 'Customer not found'
            });
        }
        
        // Verify service exists
        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(service_id);
        if (!service) {
            return res.status(400).json({
                success: false,
                error: 'Service not found'
            });
        }
        
        // Verify staff exists and available
        const staff = db.prepare('SELECT * FROM staff WHERE id = ? AND is_active = 1').get(staff_id);
        if (!staff) {
            return res.status(400).json({
                success: false,
                error: 'Staff member not available'
            });
        }
        
        // Final availability check
        const staffAvailability = checkStaffAvailability(staff_id, date, time);
        if (!staffAvailability.available) {
            return res.status(409).json({
                success: false,
                error: 'Staff member is no longer available for this time slot'
            });
        }
        
        // ============================================
        // CREATE JOB WITH STAFF ASSIGNMENT
        // ============================================
        
        const now = new Date().toISOString();
        
        const insertJob = db.prepare(`
            INSERT INTO jobs (
                customer_id, 
                service_id, 
                assigned_to, 
                job_date, 
                job_time, 
                location, 
                status, 
                notes, 
                estimated_duration,
                created_at, 
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const job = insertJob.run(
            customer_id,
            service_id,
            staff_id,
            date,
            time,
            address,
            'Scheduled', // Proper status after scheduling confirmation
            notes || '',
            estimated_duration || service.duration || 2,
            now,
            now
        );
        
        const jobId = job.lastInsertRowid;
        
        console.log(`✅ Job created with staff assignment: ID ${jobId} - ${customer.name} → ${staff.name}`);
        
        // ============================================
        // TRIGGER AUTOMATION & REAL-TIME UPDATES
        // ============================================
        
        try {
            // Get full job details for automation
            const createdJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
            
            // Log activity
            logActivity(staff_id, staff.name, 'created', 'job', jobId, `Assigned job: ${service.name}`);
            
            // Get io instance for real-time updates
            const io = req.app.get('io');
            
            if (io) {
                // Send to admin dashboard
                emitRealTimeUpdate(io, 'job-scheduled', {
                    job: createdJob,
                    customer: customer,
                    staff: staff,
                    scheduledBy: 'scheduling-system'
                }, 'admin');
                
                // Send to assigned staff
                emitRealTimeUpdate(io, 'job-assigned', {
                    job: createdJob,
                    customer: customer
                }, 'staff');
                
                console.log('📡 Real-time updates sent for job scheduling');
            }
            
            // Trigger automations
            const automationData = {
                customer_name: customer.name,
                customer_email: customer.email,
                customer_phone: customer.phone,
                service: service.name,
                date: date,
                time: time,
                address: address,
                staff_name: staff.name,
                job_id: jobId
            };
            
            await triggerAutomations('Job Scheduled', automationData, io);
            console.log('⚙️ Automations triggered for job scheduling');
            
        } catch (automationError) {
            console.warn('⚠️ Automation/real-time failed (non-critical):', automationError.message);
        }
        
        res.status(201).json({
            success: true,
            message: 'Job scheduled successfully',
            data: {
                jobId: jobId,
                jobDate: date,
                jobTime: time,
                staff: staff,
                customer: customer
            }
        });
        
    } catch (error) {
        console.error('❌ Booking confirmation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to confirm booking',
            message: error.message
        });
    }
});

/**
 * GET /api/scheduling/time-slots
 * Get available time slots for a specific date
 */
router.get('/time-slots', async (req, res) => {
    try {
        const { date, service_id } = req.query;
        
        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'Date is required'
            });
        }
        
        // Get service duration
        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(service_id);
        const duration = service ? service.duration || 2 : 2;
        
        // Generate time slots (9 AM - 6 PM, 2-hour slots)
        const timeSlots = [];
        for (let hour = 9; hour <= 18; hour += 2) {
            const time = `${String(hour).padStart(2, '0')}:00`;
            const validation = validateTimeSlot(date, time, duration);
            
            timeSlots.push({
                time,
                available: validation.available,
                conflicts: validation.conflicts || []
            });
        }
        
        res.json({
            success: true,
            data: {
                date,
                serviceDuration: duration,
                timeSlots
            }
        });
        
    } catch (error) {
        console.error('❌ Time slots error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
