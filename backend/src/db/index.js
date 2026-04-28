const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './data/expense.db';
const isMemory = dbPath === ':memory:';
const absPath = isMemory ? ':memory:' : path.resolve(dbPath);
if (!isMemory) fs.mkdirSync(path.dirname(absPath), { recursive: true });

const db = new Database(absPath);
if (isMemory) {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  const initialCategories = ['交通費', '接待費', '備品', 'その他'];
  const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
  for (const n of initialCategories) insertCat.run(n);
}
if (!isMemory) db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
