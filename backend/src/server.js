require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const db = require('./db');
const { runMigrations } = require('../scripts/migrate');
const authRoutes = require('./routes/auth');
const expensesRoutes = require('./routes/expenses');
const usersRoutes = require('./routes/users');
const categoriesRoutes = require('./routes/categories');
const approvalsRoutes = require('./routes/approvals');
const reportsRoutes = require('./routes/reports');
const notificationsRoutes = require('./routes/notifications');

// Auto-init schema if tables missing
const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
db.exec(schema);
runMigrations(db);
const initialCategories = ['交通費', '接待費', '備品', 'その他'];
const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
for (const n of initialCategories) insertCat.run(n);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/admin/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/admin/categories', require('./routes/admin_categories'));
app.use('/api/expenses', require('./routes/attachments'));
app.use('/api/expenses', approvalsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/templates', require('./routes/templates'));
app.use('/api/admin/months-closed', require('./routes/months-closed'));
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin/import', require('./routes/admin-import'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'サーバーエラーが発生しました' });
});

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
}

module.exports = app;
