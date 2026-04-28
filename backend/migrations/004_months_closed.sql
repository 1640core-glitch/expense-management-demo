CREATE TABLE IF NOT EXISTS months_closed (
  year_month TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'closed' CHECK(status IN ('closed')),
  closed_by INTEGER NOT NULL,
  closed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (closed_by) REFERENCES users(id)
);
