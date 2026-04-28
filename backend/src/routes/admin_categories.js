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
    displayOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/', authRequired, requireRole('admin'), (req, res) => {
  const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === '1';
  const sql = includeInactive
    ? 'SELECT * FROM categories ORDER BY sort_order ASC, id ASC'
    : 'SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, id ASC';
  const rows = db.prepare(sql).all();
  res.json({ categories: rows.map(toCamel) });
});

router.get('/:id', authRequired, requireRole('admin'), (req, res) => {
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'カテゴリが見つかりません' });
  res.json({ category: toCamel(row) });
});

router.post('/', authRequired, requireRole('admin'), (req, res) => {
  const { name, description, monthlyLimit, isActive, displayOrder } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name は必須です' });
  const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
  if (existing) return res.status(409).json({ error: '同名のカテゴリが既に存在します' });
  const order = displayOrder === undefined || displayOrder === null
    ? (db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM categories').get().next)
    : displayOrder;
  const result = db.prepare(
    'INSERT INTO categories (name, description, monthly_limit, is_active, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).run(
    name,
    description || null,
    monthlyLimit === undefined ? null : monthlyLimit,
    isActive === undefined ? 1 : (isActive ? 1 : 0),
    order
  );
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ category: toCamel(row) });
});

function applyUpdate(req, res) {
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'カテゴリが見つかりません' });
  const { name, description, monthlyLimit, isActive, displayOrder } = req.body || {};
  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (monthlyLimit !== undefined) { updates.push('monthly_limit = ?'); params.push(monthlyLimit); }
  if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }
  if (displayOrder !== undefined) { updates.push('sort_order = ?'); params.push(displayOrder); }
  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(row.id);
    db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }
  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(row.id);
  res.json({ category: toCamel(updated) });
}

router.patch('/:id', authRequired, requireRole('admin'), applyUpdate);
router.put('/:id', authRequired, requireRole('admin'), applyUpdate);

router.delete('/:id', authRequired, requireRole('admin'), (req, res) => {
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'カテゴリが見つかりません' });
  const expRef = db.prepare('SELECT COUNT(*) AS c FROM expenses WHERE category_id = ?').get(row.id).c;
  const tplRef = db.prepare('SELECT COUNT(*) AS c FROM templates WHERE category_id = ?').get(row.id).c;
  if (expRef > 0 || tplRef > 0) {
    return res.status(409).json({ error: '使用中のため削除できません' });
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(row.id);
  res.json({ message: '削除しました' });
});

module.exports = router;
