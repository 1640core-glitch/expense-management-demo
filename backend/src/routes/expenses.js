const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, base + ext);
  },
});
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('許可されていないファイル形式です。JPEG/PNG/GIF/WebP/PDF のみアップロード可能です。');
    err.code = 'INVALID_FILE_TYPE';
    cb(err);
  }
};
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter });

const handleUpload = (field) => (req, res, next) => {
  upload.single(field)(req, res, (err) => {
    if (err) {
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ error: err.message });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'ファイルサイズが上限を超えています。' });
      }
      return res.status(400).json({ error: 'ファイルのアップロードに失敗しました。' });
    }
    next();
  });
};

router.use(authRequired);

router.get('/', (req, res) => {
  const { status, category_id, user_id, from, to } = req.query;
  const conditions = [];
  const params = [];
  if (req.user.role === 'approver' || req.user.role === 'admin') {
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (category_id) {
      conditions.push('category_id = ?');
      params.push(Number(category_id));
    }
    if (user_id) {
      conditions.push('user_id = ?');
      params.push(Number(user_id));
    }
    if (from) {
      conditions.push('expense_date >= ?');
      params.push(from);
    }
    if (to) {
      conditions.push('expense_date <= ?');
      params.push(to);
    }
  } else {
    conditions.push('user_id = ?');
    params.push(req.user.id);
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
  }
  let sql = 'SELECT * FROM expenses';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.post('/', handleUpload('receipt'), (req, res) => {
  const { category_id, title, amount, expense_date, description } = req.body || {};
  if (!category_id || !amount || !expense_date) {
    return res.status(400).json({ error: 'category_id, amount, expense_date は必須です' });
  }
  const receipt_path = req.file ? path.basename(req.file.path) : null;
  const result = db.prepare(
    `INSERT INTO expenses (user_id, category_id, title, amount, expense_date, description, receipt_path, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`
  ).run(req.user.id, Number(category_id), title || null, Number(amount), expense_date, description || null, receipt_path);
  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

function getOwnedExpense(req, res) {
  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!row) {
    res.status(404).json({ error: '経費が見つかりません' });
    return null;
  }
  if (row.user_id !== req.user.id && req.user.role !== 'admin') {
    res.status(403).json({ error: '権限がありません' });
    return null;
  }
  return row;
}

router.get('/:id', (req, res) => {
  const row = getOwnedExpense(req, res);
  if (!row) return;
  res.json(row);
});

router.patch('/:id', handleUpload('receipt'), (req, res) => {
  const row = getOwnedExpense(req, res);
  if (!row) return;
  if (row.status !== 'draft') {
    return res.status(400).json({ error: '下書きのみ編集可能です' });
  }
  const fields = ['category_id', 'title', 'amount', 'expense_date', 'description'];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body && req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(f === 'category_id' || f === 'amount' ? Number(req.body[f]) : req.body[f]);
    }
  }
  if (req.file) {
    updates.push('receipt_path = ?');
    params.push(path.basename(req.file.path));
  }
  if (updates.length === 0) return res.json(row);
  updates.push("updated_at = CURRENT_TIMESTAMP");
  params.push(row.id);
  db.prepare(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(row.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const row = getOwnedExpense(req, res);
  if (!row) return;
  if (row.status !== 'draft') {
    return res.status(400).json({ error: '下書きのみ削除可能です' });
  }
  db.prepare('DELETE FROM expenses WHERE id = ?').run(row.id);
  res.json({ message: '削除しました' });
});

router.post('/:id/submit', (req, res) => {
  const row = getOwnedExpense(req, res);
  if (!row) return;
  if (row.status !== 'draft') {
    return res.status(400).json({ error: '下書きのみ提出可能です' });
  }
  db.prepare("UPDATE expenses SET status = 'pending', submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.id);
  const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(row.id);
  res.json(updated);
});

router.get('/:id/receipt', (req, res) => {
  const row = getOwnedExpense(req, res);
  if (!row) return;
  if (!row.receipt_path) return res.status(404).json({ error: '領収書がありません' });
  const fp = path.join(uploadDir, row.receipt_path);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: '領収書ファイルが見つかりません' });
  res.sendFile(fp);
});

module.exports = router;
