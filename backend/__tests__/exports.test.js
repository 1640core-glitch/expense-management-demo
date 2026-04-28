const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../src/server');
const db = require('../src/db');
const bcrypt = require('bcryptjs');

function makeUser(email, role) {
  const hash = bcrypt.hashSync('password123', 4);
  const r = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)')
    .run(email, hash, email.split('@')[0], role);
  return r.lastInsertRowid;
}

async function loginAs(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  return res.body.token;
}

function insertApprovedExpense(userId, categoryId, amount, date, title = 'テスト経費') {
  const r = db.prepare(
    `INSERT INTO expenses (user_id, category_id, title, amount, expense_date, status, description)
     VALUES (?, ?, ?, ?, ?, 'approved', '備考テキスト')`
  ).run(userId, categoryId, title, amount, date);
  return r.lastInsertRowid;
}

function insertAttachment(expenseId, filename, mimeType, uploadedBy) {
  const filePath = path.join('uploads', filename);
  db.prepare(
    `INSERT INTO expense_attachments (expense_id, filename, path, mime_type, size, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(expenseId, filename, filePath, mimeType, 100, uploadedBy);
}

let empToken, accToken, adminToken, empId, accId, adminId;

beforeAll(async () => {
  empId = makeUser('export-emp@test.com', 'employee');
  accId = makeUser('export-acc@test.com', 'accounting');
  adminId = makeUser('export-admin@test.com', 'admin');
  empToken = await loginAs('export-emp@test.com');
  accToken = await loginAs('export-acc@test.com');
  adminToken = await loginAs('export-admin@test.com');

  insertApprovedExpense(empId, 1, 1500, '2025-08-05', 'タクシー代');
  insertApprovedExpense(empId, 2, 8000, '2025-08-12', '会食');
  const eId = insertApprovedExpense(empId, 1, 2200, '2025-08-20', '電車');

  // Image attachment (use a real PNG from uploads if any)
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  let imgFile = null;
  if (fs.existsSync(uploadsDir)) {
    const pngs = fs.readdirSync(uploadsDir).filter((f) => f.endsWith('.png'));
    if (pngs.length) imgFile = pngs[0];
  }
  if (imgFile) insertAttachment(eId, imgFile, 'image/png', empId);

  const eId2 = insertApprovedExpense(empId, 2, 500, '2025-08-25', 'PDF領収書');
  insertAttachment(eId2, 'dummy.pdf', 'application/pdf', empId);
});

describe('GET /api/exports/monthly.pdf', () => {
  test('未認証は 401', async () => {
    const r = await request(app).get('/api/exports/monthly.pdf?year=2025&month=8');
    expect(r.status).toBe(401);
  });

  test('employee は 403', async () => {
    const r = await request(app)
      .get('/api/exports/monthly.pdf?year=2025&month=8')
      .set('Authorization', `Bearer ${empToken}`);
    expect(r.status).toBe(403);
  });

  test('year/month 欠落は 400', async () => {
    const r = await request(app)
      .get('/api/exports/monthly.pdf')
      .set('Authorization', `Bearer ${accToken}`);
    expect(r.status).toBe(400);
  });

  test('month 範囲外は 400', async () => {
    const r = await request(app)
      .get('/api/exports/monthly.pdf?year=2025&month=13')
      .set('Authorization', `Bearer ${accToken}`);
    expect(r.status).toBe(400);
  });

  test('accounting で 200, application/pdf, %PDF- マジックバイト', async () => {
    const r = await request(app)
      .get('/api/exports/monthly.pdf?year=2025&month=8')
      .set('Authorization', `Bearer ${accToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toMatch(/application\/pdf/);
    expect(r.headers['content-disposition']).toMatch(/attachment; filename="expense-report-2025-08\.pdf"/);
    expect(Buffer.isBuffer(r.body)).toBe(true);
    expect(r.body.slice(0, 5).toString('ascii')).toBe('%PDF-');
  });

  test('admin + userId フィルタで 200, %PDF-', async () => {
    const r = await request(app)
      .get(`/api/exports/monthly.pdf?year=2025&month=8&userId=${empId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(r.status).toBe(200);
    expect(r.body.slice(0, 5).toString('ascii')).toBe('%PDF-');
  });

  test('対象0件月でも 200, %PDF-', async () => {
    const r = await request(app)
      .get('/api/exports/monthly.pdf?year=2025&month=1')
      .set('Authorization', `Bearer ${accToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(r.status).toBe(200);
    expect(r.body.slice(0, 5).toString('ascii')).toBe('%PDF-');
  });
});
