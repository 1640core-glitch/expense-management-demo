const express = require('express');
const db = require('../db');
const { authRequired, requireRole, ROLES } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, requireRole(ROLES.EMPLOYEE), (req, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  res.json(rows);
});

router.post('/', authRequired, requireRole(ROLES.EMPLOYEE), (req, res) => {
  const { user_id, type, payload_json } = req.body || {};
  if (user_id === undefined || user_id === null) return res.status(400).json({ error: 'user_id は必須です' });
  if (!type) return res.status(400).json({ error: 'type は必須です' });
  const payload = payload_json == null
    ? null
    : (typeof payload_json === 'string' ? payload_json : JSON.stringify(payload_json));
  const result = db.prepare(
    'INSERT INTO notifications (user_id, type, payload_json) VALUES (?, ?, ?)'
  ).run(user_id, type, payload);
  const row = db.prepare('SELECT * FROM notifications WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.patch('/:id/read', authRequired, requireRole(ROLES.EMPLOYEE), (req, res) => {
  const row = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '通知が見つかりません' });
  if (row.user_id !== req.user.id) return res.status(403).json({ error: '権限がありません' });
  db.prepare('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ?').run(row.id);
  const updated = db.prepare('SELECT * FROM notifications WHERE id = ?').get(row.id);
  res.json(updated);
});

router.post('/read-all', authRequired, requireRole(ROLES.EMPLOYEE), (req, res) => {
  const result = db.prepare(
    'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL'
  ).run(req.user.id);
  res.json({ updated: result.changes });
});

module.exports = router;
