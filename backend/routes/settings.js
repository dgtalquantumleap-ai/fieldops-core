const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

// Note: settings table is created in setupDb.js

router.get('/', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT key, value FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/', requireAdmin, async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    await Promise.all(entries.map(([key, value]) =>
      db.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, String(value)]
      )
    ));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
