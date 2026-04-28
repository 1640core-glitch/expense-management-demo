'use strict';

const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const { parseMultipart, parseCsv } = require('../utils/multipart');

const router = express.Router();
router.use(authRequired);

const REQUIRED_HEADERS = ['user_id', 'category_id', 'amount', 'expense_date'];
const ALL_HEADERS = ['user_id', 'category_id', 'title', 'amount', 'expense_date', 'description'];

router.post('/expenses', requireRole('admin', 'accounting'), async (req, res, next) => {
  let parsed;
  try {
    parsed = await parseMultipart(req);
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message || 'multipart のパースに失敗しました' });
  }
  const file = parsed.files.find((f) => f.fieldName === 'file');
  if (!file) return res.status(400).json({ error: 'file が必要です' });

  const { headers, records } = parseCsv(file.buffer.toString('utf8'));
  for (const h of REQUIRED_HEADERS) {
    if (!headers.includes(h)) {
      return res.status(400).json({ error: `必須ヘッダがありません: ${h}` });
    }
  }

  const userExists = db.prepare('SELECT 1 FROM users WHERE id = ?');
  const catExists = db.prepare('SELECT 1 FROM categories WHERE id = ?');
  const ins = db.prepare(
    `INSERT INTO expenses (user_id, category_id, title, amount, expense_date, description, status)
     VALUES (?, ?, ?, ?, ?, ?, 'draft')`
  );

  const errors = [];
  const valid = [];
  records.forEach((r, i) => {
    const lineNo = i + 2; // 1: header
    const userId = Number(r.user_id);
    const catId = Number(r.category_id);
    const amount = Number(r.amount);
    const date = String(r.expense_date || '').trim();
    if (!Number.isInteger(userId) || userId <= 0) return errors.push({ line: lineNo, error: 'user_id が不正です' });
    if (!Number.isInteger(catId) || catId <= 0) return errors.push({ line: lineNo, error: 'category_id が不正です' });
    if (!Number.isFinite(amount) || amount <= 0) return errors.push({ line: lineNo, error: 'amount が不正です' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return errors.push({ line: lineNo, error: 'expense_date は YYYY-MM-DD 形式で入力してください' });
    if (!userExists.get(userId)) return errors.push({ line: lineNo, error: `user_id ${userId} が存在しません` });
    if (!catExists.get(catId)) return errors.push({ line: lineNo, error: `category_id ${catId} が存在しません` });
    valid.push({
      user_id: userId,
      category_id: catId,
      title: r.title || null,
      amount: Math.trunc(amount),
      expense_date: date,
      description: r.description || null,
    });
  });

  let inserted = 0;
  try {
    const tx = db.transaction((rows) => {
      for (const v of rows) {
        ins.run(v.user_id, v.category_id, v.title, v.amount, v.expense_date, v.description);
        inserted++;
      }
    });
    tx(valid);
  } catch (e) {
    return next(e);
  }

  res.status(200).json({ inserted, errors, total: records.length });
});

module.exports = router;
