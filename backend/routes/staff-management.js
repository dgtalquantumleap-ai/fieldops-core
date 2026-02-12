const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { sendEmail } = require('../utils/notifications');

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  console.log('🔍 Staff Management Auth Debug:');
  console.log('  Token received:', token ? 'Yes' : 'No');
  console.log('  Token length:', token ? token.length : 0);
  
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('  Token decoded:', decoded);
    
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND status = ?').get(decoded.id, 'active');
    console.log('  User found:', user ? 'Yes' : 'No');
    console.log('  User role:', user ? user.role : 'N/A');
    console.log('  User status:', user ? user.status : 'N/A');
    
    if (!user || user.role !== 'admin') {
      console.log('  Access denied: Not admin or user not found');
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.user = user;
    console.log('  ✅ Access granted');
    next();
  } catch (error) {
    console.log('  ❌ Token verification failed:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Log staff activity
const logActivity = (staffId, action, performedBy, reason = null, details = null) => {
  db.prepare(`
    INSERT INTO staff_activity_log (staff_id, action, performed_by, reason, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(staffId, action, performedBy, reason, details);
};

// 1. ONBOARD NEW STAFF
router.post('/onboard', requireAdmin, async (req, res) => {
  const { name, email, phone, role, password } = req.body;
  
  // Validate required fields
  if (!name || !email || !role || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Check if email already exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Email already exists' });
  }
  
  try {
    // Hash password
    const password_hash = bcrypt.hashSync(password, 10);
    
    // Insert new staff member
    const result = db.prepare(`
      INSERT INTO users (name, email, phone, role, password, status, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, 'active', datetime('now'), ?)
    `).run(name, email, phone, role, password_hash, req.user.id);
    
    // Log the onboarding
    logActivity(
      result.lastInsertRowid,
      'ONBOARDED',
      req.user.id,
      'New staff member added to system',
      JSON.stringify({ name, email, role })
    );
    
    // Get the created staff member
    const newStaff = db.prepare('SELECT id, name, email, phone, role, status, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid);
    
    // Send onboarding email
    try {
      await sendEmail({
        to: newStaff.email,
        subject: 'Welcome to Stilt Heights - Your Account Details',
        html: `
          <h2>Welcome to Stilt Heights!</h2>
          <p>Hi ${newStaff.name},</p>
          <p>Your staff account has been created. Here are your login details:</p>
          <p><strong>Email:</strong> ${newStaff.email}<br>
          <strong>Temporary Password:</strong> ${password}</p>
          <p>Please log in and change your password as soon as possible.</p>
          <p><a href="${process.env.BASE_URL || 'http://localhost:3000'}/staff/login.html">Login Here</a></p>
          <p>Best regards,<br>Stilt Heights Team</p>
        `
      });
      console.log(`📧 Onboarding email sent to ${newStaff.email}`);
    } catch (emailError) {
      console.error('Failed to send onboarding email:', emailError);
    }
    
    res.status(201).json({
      message: 'Staff member onboarded successfully',
      staff: newStaff,
      temporaryPassword: password // Send this once, they should change it
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ error: 'Failed to onboard staff member' });
  }
});

// 2. GET ALL STAFF (with filters)
router.get('/', requireAdmin, (req, res) => {
  const { status, role } = req.query;
  
  let query = 'SELECT id, name, email, phone, role, status, created_at, termination_date, last_login FROM users WHERE 1=1';
  const params = [];
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  
  if (role) {
    query += ' AND role = ?';
    params.push(role);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const staff = db.prepare(query).all(...params);
  
  // Get job counts for each staff
  const staffWithStats = staff.map(member => {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_jobs
      FROM jobs
      WHERE assigned_to = ?
    `).get(member.id);
    
    return { ...member, ...stats };
  });
  
  res.json(staffWithStats);
});

// 3. GET SINGLE STAFF DETAILS
router.get('/:id', requireAdmin, (req, res) => {
  const staff = db.prepare(`
    SELECT 
      id, name, email, phone, role, status, 
      created_at, termination_date, last_login, notes
    FROM users 
    WHERE id = ?
  `).get(req.params.id);
  
  if (!staff) {
    return res.status(404).json({ error: 'Staff member not found' });
  }
  
  // Get activity log
  const activityLog = db.prepare(`
    SELECT 
      sal.*,
      u.name as performed_by_name
    FROM staff_activity_log sal
    JOIN users u ON sal.performed_by = u.id
    WHERE sal.staff_id = ?
    ORDER BY sal.created_at DESC
    LIMIT 50
  `).all(req.params.id);
  
  // Get job statistics
  const jobStats = db.prepare(`
    SELECT 
      COUNT(*) as total_jobs,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_jobs,
      SUM(CASE WHEN status = 'Scheduled' THEN 1 ELSE 0 END) as scheduled_jobs,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_jobs
    FROM jobs
    WHERE assigned_to = ?
  `).get(req.params.id);
  
  res.json({
    ...staff,
    activityLog,
    jobStats
  });
});

// 4. UPDATE STAFF DETAILS
router.put('/:id', requireAdmin, (req, res) => {
  const { name, email, phone, role, notes } = req.body;
  
  const staff = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!staff) {
    return res.status(404).json({ error: 'Staff member not found' });
  }
  
  try {
    db.prepare(`
      UPDATE users 
      SET name = ?, email = ?, phone = ?, role = ?, notes = ?
      WHERE id = ?
    `).run(name, email, phone, role, notes, req.params.id);
    
    logActivity(
      req.params.id,
      'UPDATED',
      req.user.id,
      'Staff details updated',
      JSON.stringify({ name, email, phone, role })
    );
    
    res.json({ message: 'Staff member updated successfully' });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});

// 5. SUSPEND STAFF (temporarily disable access)
router.post('/:id/suspend', requireAdmin, async (req, res) => {
  const { reason } = req.body;
  
  const staff = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!staff) {
    return res.status(404).json({ error: 'Staff member not found' });
  }
  
  if (staff.status === 'suspended') {
    return res.status(400).json({ error: 'Staff member is already suspended' });
  }
  
  try {
    // Update status to suspended
    db.prepare('UPDATE users SET status = ?, notes = ? WHERE id = ?')
      .run('suspended', reason || 'Suspended by admin', req.params.id);
    
    // Revoke all active sessions
    db.prepare('UPDATE staff_sessions SET revoked_at = datetime(\'now\') WHERE staff_id = ? AND revoked_at IS NULL')
      .run(req.params.id);
    
    // Log the action
    logActivity(
      req.params.id,
      'SUSPENDED',
      req.user.id,
      reason || 'Suspended by admin',
      null
    );
    
    // Send suspension email
    try {
      await sendEmail({
        to: staff.email,
        subject: 'Your Stilt Heights Account Has Been Suspended',
        html: `
          <h2>Account Suspension Notice</h2>
          <p>Hi ${staff.name},</p>
          <p>Your Stilt Heights staff account has been suspended.</p>
          <p><strong>Reason:</strong> ${reason || 'Suspended by admin'}</p>
          <p>Please contact your administrator for more information.</p>
          <p>Best regards,<br>Stilt Heights Team</p>
        `
      });
      console.log(`📧 Suspension email sent to ${staff.email}`);
    } catch (emailError) {
      console.error('Failed to send suspension email:', emailError);
    }
    
    res.json({ 
      message: `${staff.name} has been suspended`,
      reason: reason || 'Suspended by admin'
    });
  } catch (error) {
    console.error('Suspension error:', error);
    res.status(500).json({ error: 'Failed to suspend staff member' });
  }
});

// 6. REACTIVATE STAFF (unsuspend)
router.post('/:id/reactivate', requireAdmin, async (req, res) => {
  const { reason } = req.body;
  
  const staff = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!staff) {
    return res.status(404).json({ error: 'Staff member not found' });
  }
  
  if (staff.status === 'inactive') {
    return res.status(400).json({ error: 'Cannot reactivate terminated staff. Please onboard as new employee.' });
  }
  
  try {
    db.prepare('UPDATE users SET status = ?, notes = ? WHERE id = ?')
      .run('active', reason || 'Reactivated by admin', req.params.id);
    
    logActivity(
      req.params.id,
      'REACTIVATED',
      req.user.id,
      reason || 'Reactivated by admin',
      null
    );
    
    // Send reactivation email
    try {
      await sendEmail({
        to: staff.email,
        subject: 'Your Stilt Heights Account Has Been Reactivated',
        html: `
          <h2>Account Reactivation</h2>
          <p>Hi ${staff.name},</p>
          <p>Your Stilt Heights staff account has been reactivated.</p>
          <p><strong>Reason:</strong> ${reason || 'Reactivated by admin'}</p>
          <p>You can now log back into your account.</p>
          <p><a href="${process.env.BASE_URL || 'http://localhost:3000'}/staff/login.html">Login Here</a></p>
          <p>Best regards,<br>Stilt Heights Team</p>
        `
      });
      console.log(`📧 Reactivation email sent to ${staff.email}`);
    } catch (emailError) {
      console.error('Failed to send reactivation email:', emailError);
    }
    
    res.json({ message: `${staff.name} has been reactivated` });
  } catch (error) {
    console.error('Reactivation error:', error);
    res.status(500).json({ error: 'Failed to reactivate staff member' });
  }
});

// 7. TERMINATE STAFF (permanent - when they leave the company)
router.post('/:id/terminate', requireAdmin, async (req, res) => {
  const { reason, termination_date } = req.body;
  
  const staff = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!staff) {
    return res.status(404).json({ error: 'Staff member not found' });
  }
  
  if (staff.status === 'inactive') {
    return res.status(400).json({ error: 'Staff member is already terminated' });
  }
  
  try {
    // Update status to inactive and set termination date
    db.prepare(`
      UPDATE users 
      SET status = 'inactive', 
          termination_date = ?, 
          notes = ?
      WHERE id = ?
    `).run(
      termination_date || new Date().toISOString().split('T')[0],
      reason || 'Terminated by admin',
      req.params.id
    );
    
    // Revoke all active sessions
    db.prepare('UPDATE staff_sessions SET revoked_at = datetime(\'now\') WHERE staff_id = ? AND revoked_at IS NULL')
      .run(req.params.id);
    
    // Unassign from all pending/scheduled jobs
    const unassignedJobs = db.prepare(`
      UPDATE jobs 
      SET assigned_to = NULL, 
          notes = notes || ' [Staff terminated: ' || ? || ']'
      WHERE assigned_to = ? 
        AND status IN ('Scheduled', 'In Progress')
    `).run(staff.name, req.params.id);
    
    // Log the termination
    logActivity(
      req.params.id,
      'TERMINATED',
      req.user.id,
      reason || 'Terminated by admin',
      JSON.stringify({ 
        termination_date: termination_date || new Date().toISOString().split('T')[0],
        unassigned_jobs: unassignedJobs.changes 
      })
    );
    
    // Send termination email
    try {
      await sendEmail({
        to: staff.email,
        subject: 'Your Stilt Heights Employment Has Been Terminated',
        html: `
          <h2>Employment Termination Notice</h2>
          <p>Hi ${staff.name},</p>
          <p>Your employment with Stilt Heights has been terminated.</p>
          <p><strong>Termination Date:</strong> ${termination_date || new Date().toISOString().split('T')[0]}</p>
          <p><strong>Reason:</strong> ${reason || 'Terminated by admin'}</p>
          <p>All system access has been revoked and any pending job assignments have been reassigned.</p>
          <p>Please contact HR for any questions regarding final paycheck, benefits, or return of company property.</p>
          <p>Best regards,<br>Stilt Heights Management</p>
        `
      });
      console.log(`📧 Termination email sent to ${staff.email}`);
    } catch (emailError) {
      console.error('Failed to send termination email:', emailError);
    }
    
    res.json({ 
      message: `${staff.name} has been terminated`,
      unassigned_jobs: unassignedJobs.changes,
      termination_date: termination_date || new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Termination error:', error);
    res.status(500).json({ error: 'Failed to terminate staff member' });
  }
});

// 8. RESET PASSWORD (admin can reset staff password)
router.post('/:id/reset-password', requireAdmin, (req, res) => {
  const { new_password } = req.body;
  
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  const staff = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!staff) {
    return res.status(404).json({ error: 'Staff member not found' });
  }
  
  try {
    const password_hash = bcrypt.hashSync(new_password, 10);
    
    db.prepare('UPDATE users SET password = ? WHERE id = ?')
      .run(password_hash, req.params.id);
    
    // Revoke all existing sessions (force re-login)
    db.prepare('UPDATE staff_sessions SET revoked_at = datetime(\'now\') WHERE staff_id = ? AND revoked_at IS NULL')
      .run(req.params.id);
    
    logActivity(
      req.params.id,
      'PASSWORD_RESET',
      req.user.id,
      'Password reset by admin',
      null
    );
    
    res.json({ 
      message: 'Password reset successfully',
      temporary_password: new_password
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// 9. GET ACTIVITY LOG
router.get('/:id/activity', requireAdmin, (req, res) => {
  const activityLog = db.prepare(`
    SELECT 
      sal.*,
      u.name as performed_by_name
    FROM staff_activity_log sal
    JOIN users u ON sal.performed_by = u.id
    WHERE sal.staff_id = ?
    ORDER BY sal.created_at DESC
  `).all(req.params.id);
  
  res.json(activityLog);
});

// 10. GET STAFF STATISTICS
router.get('/stats/overview', requireAdmin, (req, res) => {
  const stats = {
    total: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    active: db.prepare('SELECT COUNT(*) as count FROM users WHERE status = ?').get('active').count,
    suspended: db.prepare('SELECT COUNT(*) as count FROM users WHERE status = ?').get('suspended').count,
    terminated: db.prepare('SELECT COUNT(*) as count FROM users WHERE status = ?').get('inactive').count,
    hired_this_month: db.prepare(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get().count
  };
  
  res.json(stats);
});

module.exports = router;
