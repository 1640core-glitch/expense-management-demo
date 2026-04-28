const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

function toCamel(row) {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    monthlyLimit: row.monthly_limit,
    isActive: !!row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

router.post('/', authRequired, requireRole('admin'), (req, res) => {
  const { name, description, monthlyLimit, isActive } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name は必須です' });
  const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
  if (existing) return res.status(409).json({ error: '同名のカテゴリが既に存在します' });
  const result = db.prepare(
    'INSERT INTO categories (name, description, monthly_limit, is_active) VALUES (?, ?, ?, ?)'
  ).run(
    name,
    description || null,
    monthlyLimit === undefined ? null : monthlyLimit,
    isActive === undefined ? 1 : (isActive ? 1 : 0)
  );
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ category: toCamel(row) });
});

router.put('/:id', authRequired, requireRole('admin'), (req, res) => {
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'カテゴリが見つかりません' });
  const { name, description, monthlyLimit, isActive } = req.body || {};
  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (monthlyLimit !== undefined) { updates.push('monthly_limit = ?'); params.push(monthlyLimit); }
  if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(row.id);
  db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(row.id);
  res.json({ category: toCamel(updated) });
});

module.exports = router;
