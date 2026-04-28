const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { runMigrations } = require('../scripts/migrate');

function createDbWithBaseSchema() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'schema.sql'), 'utf8');
  db.exec(schema);
  return db;
}

describe('migrate.js', () => {
  test('idempotent: 2回実行で差分なし', () => {
    const db = createDbWithBaseSchema();
    const r1 = runMigrations(db);
    expect(r1.applied.length).toBeGreaterThan(0);
    expect(r1.skipped.length).toBe(0);

    const versions1 = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all();
    const r2 = runMigrations(db);
    expect(r2.applied.length).toBe(0);
    expect(r2.skipped.length).toBe(r1.applied.length);

    const versions2 = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all();
    expect(versions2).toEqual(versions1);
    db.close();
  });

  test('新テーブル・拡張列・インデックスが作成される', () => {
    const db = createDbWithBaseSchema();
    runMigrations(db);

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all().map((r) => r.name);
    for (const t of ['expense_attachments', 'expense_audit_logs', 'templates', 'months_closed', 'notifications', 'schema_migrations']) {
      expect(tables).toContain(t);
    }

    const catCols = db.prepare("PRAGMA table_info(categories)").all().map((c) => c.name);
    expect(catCols).toContain('monthly_limit');
    expect(catCols).toContain('sort_order');

    const indexes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index'"
    ).all().map((r) => r.name);
    for (const i of ['idx_attachments_expense', 'idx_audit_expense', 'idx_templates_user', 'idx_notifications_user_unread']) {
      expect(indexes).toContain(i);
    }
    db.close();
  });
});
