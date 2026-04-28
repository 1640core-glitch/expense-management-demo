const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, (req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY id').all();
  res.json(rows);
});

router.post('/', authRequired, requireRole('admin'), (req, res) => {
  const { name, description, is_active } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name は必須です' });
  const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
  if (existing) return res.status(409).json({ error: '同名のカテゴリが既に存在します' });
  const result = db.prepare(
    'INSERT INTO categories (name, description, is_active) VALUES (?, ?, ?)'
  ).run(name, description || null, is_active === undefined ? 1 : (is_active ? 1 : 0));
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.patch('/:id', authRequired, requireRole('admin'), (req, res) => {
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'カテゴリが見つかりません' });
  const { name, description, is_active } = req.body || {};
  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (updates.length === 0) return res.json(row);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(row.id);
  db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(row.id);
  res.json(updated);
});

router.delete('/:id', authRequired, requireRole('admin'), (req, res) => {
  const row = db.prepare('SELECT id FROM categories WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'カテゴリが見つかりません' });
  db.prepare('DELETE FROM categories WHERE id = ?').run(row.id);
  res.json({ message: '削除しました' });
});

module.exports = router;
