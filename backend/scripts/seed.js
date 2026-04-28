require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../src/db');
const { runMigrations } = require('./migrate');

const schema = fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'schema.sql'), 'utf8');
db.exec(schema);
runMigrations(db);

const initialCategories = ['交通費', '接待費', '備品', 'その他'];
const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
for (const n of initialCategories) insertCat.run(n);

const users = [
  { email: 'admin@example.com',     password: 'admin1234',     name: '管理者',   role: 'admin' },
  { email: 'approver@example.com',  password: 'approver1234',  name: '承認者',   role: 'approver' },
  { email: 'applicant@example.com', password: 'applicant1234', name: '申請者',   role: 'employee' },
];

const upsert = db.prepare(
  `INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)
   ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, name = excluded.name, role = excluded.role`
);

const tx = db.transaction(() => {
  for (const u of users) {
    const hash = bcrypt.hashSync(u.password, 10);
    upsert.run(u.email, hash, u.name, u.role);
  }
});
tx();

console.log('シード投入完了:', db.name);
console.log('カテゴリ:', db.prepare('SELECT id, name FROM categories ORDER BY id').all());
console.log('ユーザー:', db.prepare('SELECT id, email, name, role FROM users ORDER BY id').all());
console.log('初期パスワード:');
for (const u of users) console.log(`  ${u.role.padEnd(9)} ${u.email}  /  ${u.password}`);
