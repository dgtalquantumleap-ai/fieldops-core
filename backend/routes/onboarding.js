const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

// Get onboarding checklist for a staff member
router.get('/:staffId', requireAdmin, (req, res) => {
  const checklist = db.prepare(`
    SELECT * FROM staff_onboarding 
    WHERE staff_id = ? 
    ORDER BY created_at
  `).all(req.params.staffId);
  
  res.json(checklist);
});

// Add checklist items for new staff
router.post('/:staffId/items', requireAdmin, (req, res) => {
  const { items } = req.body; // items: array of { item, description }
  
  const insertItem = db.prepare(`
    INSERT INTO staff_onboarding (staff_id, checklist_item, notes)
    VALUES (?, ?, ?)
  `);
  
  const insertAll = db.transaction((items) => {
    for (const item of items) {
      insertItem.run(req.params.staffId, item.item, item.description || '');
    }
  });
  
  insertAll(items);
  
  res.json({ message: 'Onboarding checklist created successfully' });
});

// Update checklist item status
router.put('/:staffId/items/:itemId', requireAdmin, (req, res) => {
  const { completed, notes, completed_by } = req.body;
  
  const update = db.prepare(`
    UPDATE staff_onboarding 
    SET completed = ?, 
        completed_at = CASE WHEN ? THEN datetime('now') ELSE NULL END,
        completed_by = ?,
        notes = ?
    WHERE id = ? AND staff_id = ?
  `).run(
    completed ? 1 : 0,
    completed ? 1 : 0,
    completed_by || null,
    notes || '',
    req.params.itemId,
    req.params.staffId
  );
  
  res.json({ message: 'Checklist item updated successfully' });
});

// Get onboarding progress summary
router.get('/:staffId/progress', requireAdmin, (req, res) => {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_items,
      SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_items,
      ROUND(
        (SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
      ) as completion_percentage
    FROM staff_onboarding 
    WHERE staff_id = ?
  `).get(req.params.staffId);
  
  res.json(stats);
});

// Create default onboarding checklist for new staff
router.post('/:staffId/default-checklist', requireAdmin, (req, res) => {
  const defaultItems = [
    { item: 'Employee Handbook Review', description: 'Read and acknowledge employee handbook' },
    { item: 'Safety Training', description: 'Complete workplace safety training' },
    { item: 'Equipment Training', description: 'Training on cleaning equipment and tools' },
    { item: 'Uniform Issued', description: 'Company uniform and ID badge issued' },
    { item: 'System Access Setup', description: 'Staff portal and app login credentials' },
    { item: 'Emergency Contacts', description: 'Provide emergency contact information' },
    { item: 'Direct Deposit Setup', description: 'Set up payment information' },
    { item: 'First Day Orientation', description: 'Complete new hire orientation' },
    { item: 'Job Shadowing', description: 'Shadow experienced staff member' },
    { item: 'Performance Review Setup', description: 'Set 30/60/90 day review schedule' }
  ];
  
  const insertItem = db.prepare(`
    INSERT INTO staff_onboarding (staff_id, checklist_item, notes)
    VALUES (?, ?, ?)
  `);
  
  const insertAll = db.transaction((items) => {
    for (const item of items) {
      insertItem.run(req.params.staffId, item.item, item.description);
    }
  });
  
  insertAll(defaultItems);
  
  res.json({ 
    message: 'Default onboarding checklist created',
    items_added: defaultItems.length
  });
});

module.exports = router;
