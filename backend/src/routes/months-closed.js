const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired);

const YM_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT year_month, status, closed_by, closed_at FROM months_closed ORDER BY year_month DESC').all();
  res.json(rows);
});

router.post('/', requireRole('admin', 'accounting'), (req, res) => {
  const { year_month } = req.body || {};
  if (!year_month || !YM_RE.test(year_month)) {
    return res.status(400).json({ error: 'year_month は YYYY-MM 形式で指定してください' });
  }
  const exists = db.prepare('SELECT 1 FROM months_closed WHERE year_month = ?').get(year_month);
  if (exists) return res.status(409).json({ error: 'ALREADY_CLOSED' });
  db.prepare('INSERT INTO months_closed (year_month, status, closed_by) VALUES (?, ?, ?)')
    .run(year_month, 'closed', req.user.id);
  const row = db.prepare('SELECT year_month, status, closed_by, closed_at FROM months_closed WHERE year_month = ?').get(year_month);
  res.status(201).json(row);
});

router.delete('/:year_month', requireRole('admin', 'accounting'), (req, res) => {
  const { year_month } = req.params;
  if (!YM_RE.test(year_month)) {
    return res.status(400).json({ error: 'year_month は YYYY-MM 形式で指定してください' });
  }
  const result = db.prepare('DELETE FROM months_closed WHERE year_month = ?').run(year_month);
  if (result.changes === 0) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({ message: '解除しました' });
});

module.exports = router;
