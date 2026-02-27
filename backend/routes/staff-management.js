const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { sendEmail } = require('../utils/notifications');
const branding = require('../config/branding');

// Middleware to check if user is admin (async)
const requireAdmin = async (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    console.error('❌ CRITICAL: JWT_SECRET not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await db.query(
      'SELECT * FROM users WHERE id = $1 AND (status = $2 OR is_active = 1)',
      [decoded.id, 'active']
    );
    const user = rows[0];

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Log staff activity
const logActivity = async (staffId, action, performedBy, reason = null, details = null) => {
  await db.query(
    `INSERT INTO staff_activity_log (staff_id, action, performed_by, reason, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [staffId, action, performedBy, reason, details]
  );
};

// 1. ONBOARD NEW STAFF
router.post('/onboard', requireAdmin, async (req, res) => {
  const { name, email, phone, role, password } = req.body;

  if (!name || !email || !role || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const existing = (await db.query('SELECT id FROM users WHERE email = $1', [email])).rows[0];
  if (existing) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (name, email, phone, role, password, is_active, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, 1, NOW(), $6) RETURNING id`,
      [name, email, phone, role, password_hash, req.user.id]
    );
    const newId = result.rows[0].id;

    await logActivity(newId, 'ONBOARDED', req.user.id, 'New staff member added to system', JSON.stringify({ name, email, role }));

    const newStaff = (await db.query(
      'SELECT id, name, email, phone, role, status, created_at FROM users WHERE id = $1',
      [newId]
    )).rows[0];

    try {
      const baseUrl = process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3000';
      await sendEmail({
        to: newStaff.email,
        subject: `Welcome to ${branding.name} — Your Account Details`,
        html: `<h2>Welcome to ${branding.name}!</h2><p>Hi ${newStaff.name},</p><p>Your staff account has been created. Here are your login details:</p><p><strong>Email:</strong> ${newStaff.email}<br><strong>Temporary Password:</strong> ${password}</p><p>Please log in and change your password as soon as possible.</p><p><a href="${baseUrl}/staff/login.html">Login Here</a></p><p>Best regards,<br>${branding.name} Team</p>`
      });
    } catch (emailError) {
      console.error('Failed to send onboarding email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Staff member onboarded successfully',
      staff: { id: newStaff.id, name: newStaff.name, email: newStaff.email, role: newStaff.role, phone: newStaff.phone, created_at: newStaff.created_at }
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ error: 'Failed to onboard staff member' });
  }
});

// 2. GET ALL STAFF (with filters)
router.get('/', requireAdmin, async (req, res) => {
  const { status, role } = req.query;

  let query = 'SELECT id, name, email, phone, role, status, created_at, termination_date, last_login FROM users WHERE 1=1';
  const params = [];
  let idx = 1;

  if (status) { query += ` AND status = $${idx++}`; params.push(status); }
  if (role)   { query += ` AND role = $${idx++}`;   params.push(role); }

  query += ' ORDER BY created_at DESC';

  const staff = (await db.query(query, params)).rows;

  const staffWithStats = await Promise.all(staff.map(async member => {
    const stats = (await db.query(
      `SELECT COUNT(*) as total_jobs, SUM(CASE WHEN status='Completed' THEN 1 ELSE 0 END) as completed_jobs FROM jobs WHERE assigned_to = $1`,
      [member.id]
    )).rows[0];
    return { ...member, ...stats };
  }));

  res.json(staffWithStats);
});

// 3. GET SINGLE STAFF DETAILS
router.get('/:id', requireAdmin, async (req, res) => {
  const staff = (await db.query(
    'SELECT id, name, email, phone, role, status, created_at, termination_date, last_login, notes FROM users WHERE id = $1',
    [req.params.id]
  )).rows[0];

  if (!staff) return res.status(404).json({ error: 'Staff member not found' });

  const [activityLog, jobStats] = await Promise.all([
    db.query(
      `SELECT sal.*, u.name as performed_by_name FROM staff_activity_log sal JOIN users u ON sal.performed_by = u.id WHERE sal.staff_id = $1 ORDER BY sal.created_at DESC LIMIT 50`,
      [req.params.id]
    ),
    db.query(
      `SELECT COUNT(*) as total_jobs, SUM(CASE WHEN status='Completed' THEN 1 ELSE 0 END) as completed_jobs, SUM(CASE WHEN status='Scheduled' THEN 1 ELSE 0 END) as scheduled_jobs, SUM(CASE WHEN status='In Progress' THEN 1 ELSE 0 END) as in_progress_jobs FROM jobs WHERE assigned_to = $1`,
      [req.params.id]
    ),
  ]);

  res.json({ ...staff, activityLog: activityLog.rows, jobStats: jobStats.rows[0] });
});

// 4. UPDATE STAFF DETAILS
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, email, phone, role, notes } = req.body;

  const staff = (await db.query('SELECT * FROM users WHERE id = $1', [req.params.id])).rows[0];
  if (!staff) return res.status(404).json({ error: 'Staff member not found' });

  try {
    await db.query(
      'UPDATE users SET name=$1, email=$2, phone=$3, role=$4, notes=$5 WHERE id=$6',
      [name, email, phone, role, notes, req.params.id]
    );
    await logActivity(req.params.id, 'UPDATED', req.user.id, 'Staff details updated', JSON.stringify({ name, email, phone, role }));
    res.json({ message: 'Staff member updated successfully' });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});

// 5. SUSPEND STAFF (temporarily disable access)
router.post('/:id/suspend', requireAdmin, async (req, res) => {
  const { reason } = req.body;

  const staff = (await db.query('SELECT * FROM users WHERE id = $1', [req.params.id])).rows[0];
  if (!staff) return res.status(404).json({ error: 'Staff member not found' });
  if (staff.status === 'suspended') return res.status(400).json({ error: 'Staff member is already suspended' });

  try {
    await db.query('UPDATE users SET status=$1, notes=$2 WHERE id=$3', ['suspended', reason || 'Suspended by admin', req.params.id]);
    await db.query('UPDATE staff_sessions SET revoked_at=NOW() WHERE staff_id=$1 AND revoked_at IS NULL', [req.params.id]);
    await logActivity(req.params.id, 'SUSPENDED', req.user.id, reason || 'Suspended by admin', null);

    try {
      await sendEmail({
        to: staff.email,
        subject: `Your ${branding.name} Account Has Been Suspended`,
        html: `<h2>Account Suspension Notice</h2><p>Hi ${staff.name},</p><p>Your ${branding.name} staff account has been suspended.</p><p><strong>Reason:</strong> ${reason || 'Suspended by admin'}</p><p>Please contact your administrator for more information.</p>`
      });
    } catch (emailError) { console.error('Failed to send suspension email:', emailError); }

    res.json({ message: `${staff.name} has been suspended`, reason: reason || 'Suspended by admin' });
  } catch (error) {
    console.error('Suspension error:', error);
    res.status(500).json({ error: 'Failed to suspend staff member' });
  }
});

// 6. REACTIVATE STAFF (unsuspend)
router.post('/:id/reactivate', requireAdmin, async (req, res) => {
  const { reason } = req.body;

  const staff = (await db.query('SELECT * FROM users WHERE id = $1', [req.params.id])).rows[0];
  if (!staff) return res.status(404).json({ error: 'Staff member not found' });
  if (staff.status === 'inactive') return res.status(400).json({ error: 'Cannot reactivate terminated staff. Please onboard as new employee.' });

  try {
    await db.query('UPDATE users SET status=$1, notes=$2 WHERE id=$3', ['active', reason || 'Reactivated by admin', req.params.id]);
    await logActivity(req.params.id, 'REACTIVATED', req.user.id, reason || 'Reactivated by admin', null);

    try {
      const baseUrl = process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3000';
      await sendEmail({
        to: staff.email,
        subject: `Your ${branding.name} Account Has Been Reactivated`,
        html: `<h2>Account Reactivation</h2><p>Hi ${staff.name},</p><p>Your ${branding.name} staff account has been reactivated.</p><p><strong>Reason:</strong> ${reason || 'Reactivated by admin'}</p><p>You can now log back into your account.</p><p><a href="${baseUrl}/staff/login.html">Login Here</a></p>`
      });
    } catch (emailError) { console.error('Failed to send reactivation email:', emailError); }

    res.json({ message: `${staff.name} has been reactivated` });
  } catch (error) {
    console.error('Reactivation error:', error);
    res.status(500).json({ error: 'Failed to reactivate staff member' });
  }
});

// 7. TERMINATE STAFF (permanent)
router.post('/:id/terminate', requireAdmin, async (req, res) => {
  const { reason, termination_date } = req.body;

  const staff = (await db.query('SELECT * FROM users WHERE id = $1', [req.params.id])).rows[0];
  if (!staff) return res.status(404).json({ error: 'Staff member not found' });
  if (staff.status === 'inactive') return res.status(400).json({ error: 'Staff member is already terminated' });

  try {
    const termDate = termination_date || new Date().toISOString().split('T')[0];
    const termReason = reason || 'Terminated by admin';

    await db.query(
      `UPDATE users SET status='inactive', termination_date=$1, notes=$2 WHERE id=$3`,
      [termDate, termReason, req.params.id]
    );
    await db.query('UPDATE staff_sessions SET revoked_at=NOW() WHERE staff_id=$1 AND revoked_at IS NULL', [req.params.id]);
    const unassigned = await db.query(
      `UPDATE jobs SET assigned_to=NULL, notes=COALESCE(notes,'') || $1 WHERE assigned_to=$2 AND status IN ('Scheduled','In Progress')`,
      [` [Staff terminated: ${staff.name}]`, req.params.id]
    );

    await logActivity(req.params.id, 'TERMINATED', req.user.id, termReason, JSON.stringify({ termination_date: termDate, unassigned_jobs: unassigned.rowCount }));

    try {
      await sendEmail({
        to: staff.email,
        subject: `Your ${branding.name} Employment Has Been Terminated`,
        html: `<h2>Employment Termination Notice</h2><p>Hi ${staff.name},</p><p>Your employment with ${branding.name} has been terminated.</p><p><strong>Termination Date:</strong> ${termDate}</p><p><strong>Reason:</strong> ${termReason}</p><p>All system access has been revoked and any pending job assignments have been reassigned.</p>`
      });
    } catch (emailError) { console.error('Failed to send termination email:', emailError); }

    res.json({ message: `${staff.name} has been terminated`, unassigned_jobs: unassigned.rowCount, termination_date: termDate });
  } catch (error) {
    console.error('Termination error:', error);
    res.status(500).json({ error: 'Failed to terminate staff member' });
  }
});

// 8. RESET PASSWORD (admin can reset staff password)
router.post('/:id/reset-password', requireAdmin, async (req, res) => {
  const { new_password } = req.body;

  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const staff = (await db.query('SELECT * FROM users WHERE id = $1', [req.params.id])).rows[0];
  if (!staff) return res.status(404).json({ error: 'Staff member not found' });

  try {
    const password_hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password=$1 WHERE id=$2', [password_hash, req.params.id]);
    await db.query('UPDATE staff_sessions SET revoked_at=NOW() WHERE staff_id=$1 AND revoked_at IS NULL', [req.params.id]);
    await logActivity(req.params.id, 'PASSWORD_RESET', req.user.id, 'Password reset by admin', null);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// 9. GET ACTIVITY LOG
router.get('/:id/activity', requireAdmin, async (req, res) => {
  const { rows } = await db.query(
    `SELECT sal.*, u.name as performed_by_name FROM staff_activity_log sal JOIN users u ON sal.performed_by = u.id WHERE sal.staff_id = $1 ORDER BY sal.created_at DESC`,
    [req.params.id]
  );
  res.json(rows);
});

// 10. GET STAFF STATISTICS
router.get('/stats/overview', requireAdmin, async (req, res) => {
  const [total, active, suspended, terminated, hiredThisMonth] = await Promise.all([
    db.query('SELECT COUNT(*) as count FROM users'),
    db.query("SELECT COUNT(*) as count FROM users WHERE status = 'active'"),
    db.query("SELECT COUNT(*) as count FROM users WHERE status = 'suspended'"),
    db.query("SELECT COUNT(*) as count FROM users WHERE status = 'inactive'"),
    db.query("SELECT COUNT(*) as count FROM users WHERE TO_CHAR(created_at,'YYYY-MM') = TO_CHAR(NOW(),'YYYY-MM')"),
  ]);

  res.json({
    total: parseInt(total.rows[0].count),
    active: parseInt(active.rows[0].count),
    suspended: parseInt(suspended.rows[0].count),
    terminated: parseInt(terminated.rows[0].count),
    hired_this_month: parseInt(hiredThisMonth.rows[0].count),
  });
});

module.exports = router;
