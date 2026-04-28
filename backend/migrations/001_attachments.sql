CREATE TABLE IF NOT EXISTS expense_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  path TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  uploaded_by INTEGER NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expense_id) REFERENCES expenses(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
