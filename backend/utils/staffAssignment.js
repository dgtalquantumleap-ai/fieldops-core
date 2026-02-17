const db = require('../config/database');

// ============================================
// STAFF ASSIGNMENT LOGIC - AI-Based Routing
// ============================================

/**
 * Calculate staff workload score
 * Considers current jobs, recent work history, and performance
 */
function calculateWorkloadScore(staffId, currentDate) {
    try {
        // Get current active jobs
        const activeJobs = db.prepare(`
            SELECT COUNT(*) as count FROM jobs 
            WHERE assigned_to = ? 
            AND job_date = ? 
            AND status IN ('Scheduled', 'In Progress')
        `).get(staffId, currentDate);
        
        // Get completed jobs in last 30 days
        const recentJobs = db.prepare(`
            SELECT COUNT(*) as count, AVG(estimated_duration) as avg_duration
            FROM jobs 
            WHERE assigned_to = ? 
            AND job_date >= date('now', '-30 days')
            AND status = 'completed'
        `).get(staffId);
        
        // Calculate workload score (lower is better)
        let workloadScore = 0;
        
        // Penalty for current jobs (each job reduces score)
        workloadScore -= (activeJobs.count * 10);
        
        // Bonus for completed jobs (experience bonus)
        if (recentJobs.count > 0) {
            workloadScore += Math.min(recentJobs.count * 2, 20); // Max 20 points
        }
        
        // Efficiency bonus (faster completion = higher score)
        if (recentJobs.avg_duration) {
            const efficiencyBonus = Math.max(0, (3 - recentJobs.avg_duration) * 5);
            workloadScore += efficiencyBonus;
        }
        
        return {
            workloadScore: Math.max(-100, workloadScore),
            activeJobs: activeJobs.count,
            recentJobs: recentJobs.count,
            avgDuration: recentJobs.avg_duration || 0
        };
    } catch (error) {
        console.error('Workload score calculation error:', error);
        return { workloadScore: 0, error: error.message };
    }
}

/**
 * Calculate skill match score for service
 */
function calculateSkillMatch(staff, serviceId) {
    try {
        // Get service details
        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
        if (!service) return 0;
        
        let skillScore = 0;
        
        // Role-based skill matching
        const roleScores = {
            'Admin': 10,
            'Manager': 8,
            'Senior Staff': 7,
            'Staff': 5,
            'Junior Staff': 3
        };
        
        skillScore += roleScores[staff.role] || 0;
        
        // Service category matching (if services have categories)
        if (service.category && staff.specialties) {
            const specialties = staff.specialties.split(',').map(s => s.trim().toLowerCase());
            if (specialties.includes(service.category.toLowerCase())) {
                skillScore += 15;
            }
        }
        
        // Experience bonus (years of experience)
        if (staff.years_experience) {
            const experienceBonus = Math.min(staff.years_experience * 2, 20);
            skillScore += experienceBonus;
        }
        
        return Math.min(skillScore, 50); // Cap at 50
    } catch (error) {
        console.error('Skill match calculation error:', error);
        return 0;
    }
}

/**
 * Calculate availability score
 */
function calculateAvailabilityScore(staff, requestedDate, requestedTime) {
    try {
        let availabilityScore = 50; // Base score
        
        // Check if staff is generally available
        if (!staff.is_active) {
            return -100; // Unavailable staff get negative score
        }
        
        // Check time-off or unavailability
        const timeOff = db.prepare(`
            SELECT COUNT(*) as count FROM staff_unavailability 
            WHERE staff_id = ? 
            AND ? BETWEEN start_date AND end_date
        `).get(staff.id, requestedDate);
        
        if (timeOff.count > 0) {
            availabilityScore -= 30;
        }
        
        // Check preferred working hours
        const [requestedHour] = requestedTime.split(':').map(Number);
        const workHours = {
            start: staff.work_hours_start ? parseInt(staff.work_hours_start.split(':')[0]) : 9,
            end: staff.work_hours_end ? parseInt(staff.work_hours_end.split(':')[0]) : 17
        };
        
        if (requestedHour < workHours.start || requestedHour > workHours.end) {
            availabilityScore -= 15;
        }
        
        // Check recent workload (avoid overworking)
        const recentWorkload = calculateWorkloadScore(staff.id, requestedDate);
        if (recentWorkload.activeJobs >= 3) {
            availabilityScore -= 25;
        }
        
        return Math.max(0, availabilityScore);
    } catch (error) {
        console.error('Availability score calculation error:', error);
        return 0;
    }
}

/**
 * Get optimal staff assignment using comprehensive scoring
 */
function getOptimalStaffAssignment(serviceId, date, time, excludeStaffId = null) {
    try {
        console.log('🎯 Calculating optimal staff assignment for service:', serviceId);
        
        // Get all active staff
        const activeStaff = db.prepare(`
            SELECT * FROM staff WHERE is_active = 1 AND id != ?
            ORDER BY role DESC, name ASC
        `).all(excludeStaffId);
        
        if (activeStaff.length === 0) {
            return {
                recommended: null,
                alternatives: [],
                error: 'No active staff available'
            };
        }
        
        // Calculate comprehensive scores for each staff member
        const scoredStaff = activeStaff.map(staff => {
            const workloadScore = calculateWorkloadScore(staff.id, date);
            const skillScore = calculateSkillMatch(staff, serviceId);
            const availabilityScore = calculateAvailabilityScore(staff, date, time);
            
            // Calculate final score
            const finalScore = Math.max(0, 
                workloadScore.workloadScore + 
                skillScore + 
                availabilityScore
            );
            
            return {
                ...staff,
                scores: {
                    workload: workloadScore.workloadScore,
                    skill: skillScore,
                    availability: availabilityScore,
                    final: finalScore
                },
                reasoning: {
                    workload: workloadScore.activeJobs > 2 ? 'High current workload' : 'Available',
                    skill: skillScore > 20 ? 'Strong skill match' : 'Moderate skill match',
                    availability: availabilityScore > 30 ? 'Fully available' : 'Limited availability'
                }
            };
        });
        
        // Sort by final score (highest first)
        const sortedStaff = scoredStaff.sort((a, b) => b.scores.final - a.scores.final);
        
        // Filter out staff with negative scores (unavailable)
        const availableStaff = sortedStaff.filter(staff => staff.scores.final > 0);
        
        if (availableStaff.length === 0) {
            return {
                recommended: null,
                alternatives: [],
                error: 'No staff members are available for this time slot'
            };
        }
        
        const recommended = availableStaff[0];
        const alternatives = availableStaff.slice(1, 4); // Top 5 alternatives
        
        console.log('✅ Staff assignment calculated:', {
            recommended: recommended.name,
            score: recommended.scores.final,
            alternatives: alternatives.length
        });
        
        return {
            recommended,
            alternatives,
            allCandidates: scoredStaff,
            totalCandidates: activeStaff.length,
            availableCandidates: availableStaff.length
        };
        
    } catch (error) {
        console.error('Optimal staff assignment error:', error);
        return { error: error.message };
    }
}

/**
 * Check for assignment conflicts
 */
function checkAssignmentConflicts(staffId, date, time, duration = 2, excludeJobId = null) {
    try {
        const [hours, minutes] = time.split(':').map(Number);
        const startTime = new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
        const endTime = new Date(startTime.getTime() + (duration * 60 * 60 * 1000));
        
        // Check for conflicting assignments
        const conflicts = db.prepare(`
            SELECT * FROM jobs 
            WHERE assigned_to = ? 
            AND job_date = ? 
            AND status NOT IN ('Cancelled', 'completed')
            AND id != ?
            AND (
                (job_time <= ? AND ADD_TIME(job_time, '02:00') > ?) OR
                (job_time < ? AND ADD_TIME(job_time, '02:00') >= ?)
            )
        `).all(staffId, date, excludeJobId, time, time, endTime);
        
        return {
            hasConflicts: conflicts.length > 0,
            conflicts: conflicts.map(job => ({
                jobId: job.id,
                time: job.job_time,
                service: job.service_name,
                status: job.status
            }))
        };
    } catch (error) {
        console.error('Assignment conflict check error:', error);
        return { hasConflicts: true, error: error.message };
    }
}

/**
 * Update staff workload metrics
 */
function updateStaffMetrics(staffId, jobId, action) {
    try {
        const metrics = {
            staff_id: staffId,
            job_id: jobId,
            action: action, // 'assigned', 'completed', 'cancelled'
            timestamp: new Date().toISOString()
        };
        
        // This could be stored in a staff_metrics table for analytics
        console.log('📊 Staff metrics updated:', metrics);
        
        return metrics;
    } catch (error) {
        console.error('Staff metrics update error:', error);
        return null;
    }
}

/**
 * Get staff performance analytics
 */
function getStaffPerformance(staffId, days = 30) {
    try {
        const performance = db.prepare(`
            SELECT 
                COUNT(*) as total_jobs,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
                AVG(estimated_duration) as avg_duration,
                MIN(estimated_duration) as min_duration,
                MAX(estimated_duration) as max_duration
            FROM jobs 
            WHERE assigned_to = ? 
            AND job_date >= date('now', '-${days} days')
        `).get(staffId);
        
        const completionRate = performance.total_jobs > 0 
            ? (performance.completed_jobs / performance.total_jobs) * 100 
            : 0;
        
        return {
            ...performance,
            completionRate: Math.round(completionRate),
            rating: completionRate >= 95 ? 'Excellent' : 
                    completionRate >= 85 ? 'Good' : 
                    completionRate >= 70 ? 'Average' : 'Poor'
        };
    } catch (error) {
        console.error('Staff performance error:', error);
        return null;
    }
}

module.exports = {
    getOptimalStaffAssignment,
    checkAssignmentConflicts,
    updateStaffMetrics,
    getStaffPerformance,
    calculateWorkloadScore,
    calculateSkillMatch,
    calculateAvailabilityScore
};
