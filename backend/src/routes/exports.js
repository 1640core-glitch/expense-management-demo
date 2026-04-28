const express = require('express');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

const FONT_PATH = path.join(__dirname, '..', '..', 'assets', 'fonts', 'NotoSansJP-Regular.ttf');
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

function parseYM(req, res) {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!year || !month || month < 1 || month > 12) {
    res.status(400).json({ error: 'year, month は必須です' });
    return null;
  }
  const mm = String(month).padStart(2, '0');
  const start = `${year}-${mm}-01`;
  const endY = month === 12 ? year + 1 : year;
  const endM = month === 12 ? 1 : month + 1;
  const end = `${endY}-${String(endM).padStart(2, '0')}-01`;
  return { year, month, start, end };
}

function fetchData(ym, userId) {
  const userFilter = userId ? ' AND e.user_id = ?' : '';
  const baseParams = [ym.start, ym.end];
  if (userId) baseParams.push(userId);

  const byCategory = db.prepare(
    `SELECT c.id AS category_id, c.name AS category_name,
            COALESCE(SUM(e.amount), 0) AS total, COUNT(e.id) AS count
     FROM categories c
     LEFT JOIN expenses e ON e.category_id = c.id
       AND e.status = 'approved'
       AND e.expense_date >= ? AND e.expense_date < ?${userFilter}
     GROUP BY c.id, c.name
     ORDER BY c.id`
  ).all(...baseParams);

  const byUser = db.prepare(
    `SELECT u.id AS user_id, u.name AS user_name,
            COALESCE(SUM(e.amount), 0) AS total, COUNT(e.id) AS count
     FROM users u
     JOIN expenses e ON e.user_id = u.id
       AND e.status = 'approved'
       AND e.expense_date >= ? AND e.expense_date < ?${userFilter}
     GROUP BY u.id, u.name
     ORDER BY u.id`
  ).all(...baseParams);

  const detailFilter = userId ? ' AND e.user_id = ?' : '';
  const detailParams = [ym.start, ym.end];
  if (userId) detailParams.push(userId);
  const details = db.prepare(
    `SELECT e.id, e.expense_date, u.name AS user_name, c.name AS category_name,
            e.title, e.amount, e.status, e.description, e.receipt_path,
            (SELECT path FROM expense_attachments WHERE expense_id = e.id ORDER BY id LIMIT 1) AS attach_path,
            (SELECT mime_type FROM expense_attachments WHERE expense_id = e.id ORDER BY id LIMIT 1) AS attach_mime,
            (SELECT filename FROM expense_attachments WHERE expense_id = e.id ORDER BY id LIMIT 1) AS attach_filename
     FROM expenses e
     JOIN users u ON u.id = e.user_id
     JOIN categories c ON c.id = e.category_id
     WHERE e.expense_date >= ? AND e.expense_date < ?${detailFilter}
     ORDER BY e.expense_date, e.id`
  ).all(...detailParams);

  return { byCategory, byUser, details };
}

function buildPdf(doc, ym, data) {
  const hasFont = fs.existsSync(FONT_PATH);
  if (hasFont) {
    try { doc.registerFont('jp', FONT_PATH); doc.font('jp'); } catch (e) { /* fallback to default */ }
  }

  const mm = String(ym.month).padStart(2, '0');
  doc.fontSize(18).text(`月次経費レポート ${ym.year}年${mm}月`, { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(10).text(`生成日時: ${new Date().toISOString()}`, { align: 'right' });
  doc.text(`対象期間: ${ym.start} 〜 ${ym.end}`, { align: 'right' });
  doc.moveDown();

  doc.fontSize(13).text('カテゴリ別集計');
  doc.fontSize(10);
  let catTotal = 0;
  for (const r of data.byCategory) {
    catTotal += r.total;
    doc.text(`${r.category_name}: ¥${r.total.toLocaleString()} (${r.count}件)`);
  }
  doc.text(`合計: ¥${catTotal.toLocaleString()}`);
  doc.moveDown();

  doc.fontSize(13).text('ユーザ別集計');
  doc.fontSize(10);
  for (const r of data.byUser) {
    doc.text(`${r.user_name}: ¥${r.total.toLocaleString()} (${r.count}件)`);
  }
  doc.moveDown();

  doc.fontSize(13).text('明細');
  doc.fontSize(9);
  for (const e of data.details) {
    doc.text(`${e.expense_date} | ${e.user_name} | ${e.category_name} | ${e.title || ''} | ¥${e.amount.toLocaleString()} | ${e.status}`);
    if (e.description) doc.text(`  備考: ${e.description}`);
  }
  doc.moveDown();

  doc.fontSize(13).text('領収書');
  doc.fontSize(9);
  let imgCount = 0;
  for (const e of data.details) {
    const mime = e.attach_mime;
    const relPath = e.attach_path || e.receipt_path;
    if (!relPath) continue;
    const absPath = path.isAbsolute(relPath) ? relPath : path.join(UPLOAD_DIR, path.basename(relPath));
    if (mime && IMAGE_MIMES.has(mime) && fs.existsSync(absPath)) {
      try {
        doc.text(`#${e.id} ${e.attach_filename || path.basename(absPath)}`);
        doc.image(absPath, { fit: [120, 120] });
        doc.moveDown(0.5);
        imgCount += 1;
      } catch (err) {
        doc.text(`#${e.id} [画像読込失敗] ${e.attach_filename || ''}`);
      }
    } else if (mime === 'application/pdf') {
      doc.text(`#${e.id} [PDF] ${e.attach_filename || ''}`);
    } else if (relPath) {
      doc.text(`#${e.id} [ファイル] ${e.attach_filename || path.basename(relPath)}`);
    }
  }
  if (imgCount === 0 && data.details.length === 0) {
    doc.text('（対象データなし）');
  }
}

router.get(
  '/monthly.pdf',
  authRequired,
  requireRole('approver', 'admin', 'accounting'),
  (req, res, next) => {
    const ym = parseYM(req, res);
    if (!ym) return;
    const userId = req.query.userId ? Number(req.query.userId) : null;
    if (req.query.userId !== undefined && (!userId || userId < 1)) {
      return res.status(400).json({ error: 'userId は数値で指定してください' });
    }
    let data;
    try {
      data = fetchData(ym, userId);
    } catch (err) {
      return next(err);
    }

    const mm = String(ym.month).padStart(2, '0');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="expense-report-${ym.year}-${mm}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.on('error', next);
    doc.pipe(res);
    try {
      buildPdf(doc, ym, data);
    } catch (err) {
      return next(err);
    }
    doc.end();
  }
);

module.exports = router;
