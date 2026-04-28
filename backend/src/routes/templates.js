const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, (req, res) => {
  const rows = db.prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY id').all(req.user.id);
  res.json(rows);
});

router.post('/', authRequired, (req, res) => {
  const { name, categoryId, amount, title, description } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name は必須です' });
  if (categoryId === undefined || categoryId === null) return res.status(400).json({ error: 'categoryId は必須です' });
  const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId);
  if (!cat) return res.status(400).json({ error: '指定の categoryId は存在しません' });
  const result = db.prepare(
    'INSERT INTO templates (user_id, name, category_id, title, amount, description) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, name, categoryId, title || null, amount == null ? null : amount, description || null);
  const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.put('/:id', authRequired, (req, res) => {
  const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'テンプレートが見つかりません' });
  if (row.user_id !== req.user.id) return res.status(403).json({ error: '権限がありません' });
  const { name, categoryId, amount, title, description } = req.body || {};
  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (categoryId !== undefined) {
    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId);
    if (!cat) return res.status(400).json({ error: '指定の categoryId は存在しません' });
    updates.push('category_id = ?'); params.push(categoryId);
  }
  if (amount !== undefined) { updates.push('amount = ?'); params.push(amount); }
  if (title !== undefined) { updates.push('title = ?'); params.push(title); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (updates.length === 0) return res.json(row);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(row.id);
  db.prepare(`UPDATE templates SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const updated = db.prepare('SELECT * FROM templates WHERE id = ?').get(row.id);
  res.json(updated);
});

router.delete('/:id', authRequired, (req, res) => {
  const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'テンプレートが見つかりません' });
  if (row.user_id !== req.user.id) return res.status(403).json({ error: '権限がありません' });
  db.prepare('DELETE FROM templates WHERE id = ?').run(row.id);
  res.json({ message: '削除しました' });
});

module.exports = router;
