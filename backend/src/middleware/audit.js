const db = require('../db');

const ALLOWED_ACTIONS = new Set([
  'create', 'update', 'submit', 'approve', 'reject', 'withdraw', 'attach', 'detach', 'paid'
]);

const insertStmt = () => db.prepare(
  `INSERT INTO expense_audit_logs
   (expense_id, actor_id, action, from_status, to_status, comment, diff_json)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

function recordAudit({ expenseId, actorId, action, fromStatus = null, toStatus = null, comment = null, diff = null }) {
  if (!ALLOWED_ACTIONS.has(action)) {
    throw new Error(`Invalid audit action: ${action}`);
  }
  const diffJson = diff == null ? null : (typeof diff === 'string' ? diff : JSON.stringify(diff));
  const r = insertStmt().run(expenseId, actorId, action, fromStatus, toStatus, comment, diffJson);
  return r.lastInsertRowid;
}

function listAudit(expenseId) {
  return db.prepare(
    `SELECT al.id, al.expense_id, al.actor_id, u.name AS actor_name,
            al.action, al.from_status, al.to_status, al.comment, al.diff_json, al.created_at
     FROM expense_audit_logs al
     LEFT JOIN users u ON u.id = al.actor_id
     WHERE al.expense_id = ?
     ORDER BY al.id ASC`
  ).all(expenseId);
}

module.exports = { recordAudit, listAudit, ALLOWED_ACTIONS };
