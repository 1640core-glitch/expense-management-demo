const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authRequired, signToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { email, password, name, role } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, name は必須です' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'このメールアドレスは既に登録されています' });
  const hash = bcrypt.hashSync(password, 10);
  const userRole = ['employee', 'approver', 'admin'].includes(role) ? role : 'employee';
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)'
  ).run(email, hash, name, userRole);
  const user = { id: result.lastInsertRowid, email, name, role: userRole };
  const token = signToken(user);
  res.status(201).json({ user, token });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email, password は必須です' });
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'メールアドレスまたはパスワードが違います' });
  }
  const user = { id: row.id, email: row.email, name: row.name, role: row.role };
  const token = signToken(user);
  res.json({ user, token });
});

router.post('/logout', (req, res) => {
  res.json({ message: 'ログアウトしました' });
});

router.get('/me', authRequired, (req, res) => {
  const row = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!row) return res.status(404).json({ error: 'ユーザーが見つかりません' });
  res.json(row);
});

module.exports = router;
