const fs = require('fs');
const path = require('path');
const db = require('./index');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

const initialCategories = ['交通費', '接待費', '備品', 'その他'];
const insert = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
const tx = db.transaction((names) => {
  for (const n of names) insert.run(n);
});
tx(initialCategories);

console.log('DB初期化完了:', db.name);
console.log('カテゴリ:', db.prepare('SELECT * FROM categories').all());
