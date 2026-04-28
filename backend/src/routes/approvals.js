const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(authRequired, requireRole('approver', 'admin'));

function act(action, finalStatus) {
  return (req, res) => {
    const id = Number(req.params.id);
    const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: '経費が見つかりません' });
    if (row.status !== 'pending') {
      return res.status(400).json({ error: '承認待ちの経費のみ処理可能です' });
    }
    const comment = (req.body && req.body.comment) || null;
    const tx = db.transaction(() => {
      db.prepare(
        'INSERT INTO approvals (expense_id, approver_id, action, comment) VALUES (?, ?, ?, ?)'
      ).run(id, req.user.id, action, comment);
      db.prepare(
        "UPDATE expenses SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(finalStatus, id);
    });
    tx();
    const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    res.json(updated);
  };
}

router.post('/:id/approve', act('approve', 'approved'));
router.post('/:id/reject', act('reject', 'rejected'));

module.exports = router;
