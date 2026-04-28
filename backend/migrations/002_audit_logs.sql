CREATE TABLE IF NOT EXISTS expense_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER NOT NULL,
  actor_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('create','update','submit','approve','reject','withdraw','attach','detach','paid')),
  from_status TEXT,
  to_status TEXT,
  comment TEXT,
  diff_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expense_id) REFERENCES expenses(id),
  FOREIGN KEY (actor_id) REFERENCES users(id)
);
