const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

function splitStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^--/.test(s));
}

function runMigrations(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  if (!fs.existsSync(MIGRATIONS_DIR)) return { applied: [], skipped: [] };

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const isApplied = db.prepare('SELECT 1 FROM schema_migrations WHERE version = ?');
  const markApplied = db.prepare('INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)');

  const applied = [];
  const skipped = [];

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    if (isApplied.get(version)) {
      skipped.push(version);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const statements = splitStatements(sql);
    const tx = db.transaction(() => {
      for (const stmt of statements) {
        try {
          db.exec(stmt);
        } catch (e) {
          // idempotent: ALTER TABLE で既に列が存在する場合はスキップ
          if (/duplicate column name/i.test(e.message)) continue;
          throw e;
        }
      }
      markApplied.run(version);
    });
    tx();
    applied.push(version);
  }

  return { applied, skipped };
}

module.exports = { runMigrations };

if (require.main === module) {
  const db = require('../src/db');
  const result = runMigrations(db);
  console.log('Applied:', result.applied);
  console.log('Skipped:', result.skipped);
}
