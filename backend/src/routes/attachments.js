const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

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

function getExpense(id) {
  return db.prepare('SELECT * FROM expenses WHERE id = ?').get(Number(id));
}

router.post('/:id/attachments', handleUpload('file'), (req, res) => {
  const expense = getExpense(req.params.id);
  if (!expense) return res.status(404).json({ error: '経費が見つかりません' });
  if (expense.user_id !== req.user.id) {
    return res.status(403).json({ error: '権限がありません' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'ファイルが必要です' });
  }
  const filename = path.basename(req.file.path);
  const result = db.prepare(
    `INSERT INTO expense_attachments (expense_id, filename, path, mime_type, size, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(expense.id, req.file.originalname, filename, req.file.mimetype, req.file.size, req.user.id);
  const row = db.prepare('SELECT * FROM expense_attachments WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.get('/:id/attachments', (req, res) => {
  const expense = getExpense(req.params.id);
  if (!expense) return res.status(404).json({ error: '経費が見つかりません' });
  const isOwner = expense.user_id === req.user.id;
  const isPrivileged = req.user.role === 'approver' || req.user.role === 'admin' || req.user.role === 'accounting';
  if (!isOwner && !isPrivileged) {
    return res.status(403).json({ error: '権限がありません' });
  }
  const rows = db.prepare('SELECT * FROM expense_attachments WHERE expense_id = ? ORDER BY uploaded_at ASC, id ASC').all(expense.id);
  const result = rows.slice();
  if (expense.receipt_path) {
    const exists = rows.some((r) => r.path === expense.receipt_path);
    if (!exists) {
      result.unshift({
        id: null,
        expense_id: expense.id,
        filename: expense.receipt_path,
        path: expense.receipt_path,
        mime_type: null,
        size: null,
        uploaded_by: expense.user_id,
        uploaded_at: expense.created_at,
        legacy: true,
      });
    }
  }
  res.json(result);
});

router.delete('/:id/attachments/:attId', (req, res) => {
  const expense = getExpense(req.params.id);
  if (!expense) return res.status(404).json({ error: '経費が見つかりません' });
  if (expense.user_id !== req.user.id) {
    return res.status(403).json({ error: '権限がありません' });
  }
  if (expense.status !== 'draft') {
    return res.status(400).json({ error: '下書き状態のみ削除可能です' });
  }
  const att = db.prepare('SELECT * FROM expense_attachments WHERE id = ? AND expense_id = ?').get(Number(req.params.attId), expense.id);
  if (!att) return res.status(404).json({ error: '添付が見つかりません' });
  db.prepare('DELETE FROM expense_attachments WHERE id = ?').run(att.id);
  try {
    const filePath = path.join(uploadDir, att.path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    // ignore physical delete errors
  }
  res.json({ ok: true });
});

module.exports = router;
