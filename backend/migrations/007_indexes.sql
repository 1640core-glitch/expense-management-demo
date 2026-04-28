CREATE INDEX IF NOT EXISTS idx_attachments_expense ON expense_attachments(expense_id);
CREATE INDEX IF NOT EXISTS idx_audit_expense ON expense_audit_logs(expense_id);
CREATE INDEX IF NOT EXISTS idx_templates_user ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at);
