const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired, requireRole('admin'));

const ROLES = ['employee', 'approver', 'accounting', 'admin'];

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT id, email, name, role, manager_id, created_at, updated_at FROM users ORDER BY id').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { email, password, name, role, manager_id } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, name は必須です' });
  }
  const userRole = role || 'employee';
  if (!ROLES.includes(userRole)) {
    return res.status(400).json({ error: 'role が不正です' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'このメールアドレスは既に登録されています' });
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, name, role, manager_id) VALUES (?, ?, ?, ?, ?)'
  ).run(email, hash, name, userRole, manager_id || null);
  const row = db.prepare('SELECT id, email, name, role, manager_id, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.patch('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'ユーザーが見つかりません' });
  const { email, password, name, role, manager_id } = req.body || {};
  const updates = [];
  const params = [];
  if (email !== undefined) { updates.push('email = ?'); params.push(email); }
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (role !== undefined) {
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'role が不正です' });
    updates.push('role = ?'); params.push(role);
  }
  if (manager_id !== undefined) { updates.push('manager_id = ?'); params.push(manager_id || null); }
  if (password) { updates.push('password_hash = ?'); params.push(bcrypt.hashSync(password, 10)); }
  if (updates.length === 0) return res.json(row);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(row.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const updated = db.prepare('SELECT id, email, name, role, manager_id, created_at, updated_at FROM users WHERE id = ?').get(row.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'ユーザーが見つかりません' });
  if (row.id === req.user.id) return res.status(400).json({ error: '自分自身は削除できません' });
  db.prepare('DELETE FROM users WHERE id = ?').run(row.id);
  res.json({ message: '削除しました' });
});

module.exports = router;
