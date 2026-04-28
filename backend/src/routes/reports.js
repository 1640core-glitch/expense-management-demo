const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/summary', authRequired, (req, res) => {
  const ym = String(req.query.yearMonth || '');
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) {
    return res.status(400).json({ error: 'yearMonth は YYYY-MM 形式で指定してください' });
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) {
    return res.status(400).json({ error: 'yearMonth の月は 01-12 で指定してください' });
  }
  const start = `${m[1]}-${m[2]}-01`;
  const endY = month === 12 ? year + 1 : year;
  const endM = month === 12 ? 1 : month + 1;
  const end = `${endY}-${String(endM).padStart(2, '0')}-01`;

  const isEmployee = req.user.role === 'employee';
  const params = [start, end];
  const userFilter = isEmployee ? ' AND e.user_id = ?' : '';
  if (isEmployee) params.push(req.user.id);

  const byCategory = db.prepare(
    `SELECT c.id AS categoryId, c.name AS categoryName,
            COALESCE(SUM(e.amount), 0) AS total, COUNT(e.id) AS count
     FROM categories c
     LEFT JOIN expenses e ON e.category_id = c.id
       AND e.status = 'approved'
       AND e.expense_date >= ? AND e.expense_date < ?${userFilter}
     GROUP BY c.id, c.name
     ORDER BY c.id`
  ).all(...params);

  const byUserParams = [start, end];
  const byUserFilter = isEmployee ? ' AND e.user_id = ?' : '';
  if (isEmployee) byUserParams.push(req.user.id);
  const byUser = db.prepare(
    `SELECT u.id AS userId, u.name AS userName,
            COALESCE(SUM(e.amount), 0) AS total, COUNT(e.id) AS count
     FROM users u
     JOIN expenses e ON e.user_id = u.id
       AND e.status = 'approved'
       AND e.expense_date >= ? AND e.expense_date < ?${byUserFilter}
     GROUP BY u.id, u.name
     ORDER BY u.id`
  ).all(...byUserParams);

  const total = byCategory.reduce((s, r) => s + r.total, 0);
  res.json({ yearMonth: ym, byCategory, byUser, total });
});

router.use(authRequired, requireRole('approver', 'admin'));

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

router.get('/monthly', (req, res) => {
  const ym = parseYM(req, res);
  if (!ym) return;
  const rows = db.prepare(
    `SELECT c.id AS category_id, c.name AS category_name, COALESCE(SUM(e.amount), 0) AS total, COUNT(e.id) AS count
     FROM categories c
     LEFT JOIN expenses e ON e.category_id = c.id
       AND e.status = 'approved'
       AND e.expense_date >= ? AND e.expense_date < ?
     GROUP BY c.id, c.name
     ORDER BY c.id`
  ).all(ym.start, ym.end);
  const total = rows.reduce((s, r) => s + r.total, 0);
  res.json({ year: ym.year, month: ym.month, total, categories: rows });
});

router.get('/csv', (req, res) => {
  const ym = parseYM(req, res);
  if (!ym) return;
  const rows = db.prepare(
    `SELECT e.id, e.expense_date, u.name AS user_name, c.name AS category_name,
            e.title, e.amount, e.status, e.description
     FROM expenses e
     JOIN users u ON u.id = e.user_id
     JOIN categories c ON c.id = e.category_id
     WHERE e.expense_date >= ? AND e.expense_date < ?
     ORDER BY e.expense_date, e.id`
  ).all(ym.start, ym.end);
  const header = ['ID', '日付', '申請者', 'カテゴリ', '件名', '金額', 'ステータス', '備考'];
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([r.id, r.expense_date, r.user_name, r.category_name, r.title, r.amount, r.status, r.description].map(esc).join(','));
  }
  const csv = '\uFEFF' + lines.join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="report-${ym.year}-${String(ym.month).padStart(2, '0')}.csv"`);
  res.send(csv);
});

module.exports = router;
