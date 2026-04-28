const request = require('supertest');
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

function insertApprovedExpense(userId, categoryId, amount, date) {
  db.prepare(
    `INSERT INTO expenses (user_id, category_id, title, amount, expense_date, status)
     VALUES (?, ?, ?, ?, ?, 'approved')`
  ).run(userId, categoryId, 'test', amount, date);
}

let empToken, accToken, empId, otherEmpId;

beforeAll(async () => {
  empId = makeUser('summary-emp@test.com', 'employee');
  otherEmpId = makeUser('summary-emp2@test.com', 'employee');
  makeUser('summary-acc@test.com', 'accounting');
  empToken = await loginAs('summary-emp@test.com');
  accToken = await loginAs('summary-acc@test.com');

  insertApprovedExpense(empId, 1, 1000, '2025-06-10');
  insertApprovedExpense(empId, 2, 2000, '2025-06-15');
  insertApprovedExpense(otherEmpId, 1, 5000, '2025-06-20');
  insertApprovedExpense(empId, 1, 9999, '2025-07-01');
});

describe('GET /api/reports/summary', () => {
  test('yearMonth 未指定は 400', async () => {
    const r = await request(app).get('/api/reports/summary')
      .set('Authorization', `Bearer ${accToken}`);
    expect(r.status).toBe(400);
  });

  test('未認証は 401', async () => {
    const r = await request(app).get('/api/reports/summary?yearMonth=2025-06');
    expect(r.status).toBe(401);
  });

  test('accounting は全ユーザー集計', async () => {
    const r = await request(app).get('/api/reports/summary?yearMonth=2025-06')
      .set('Authorization', `Bearer ${accToken}`);
    expect(r.status).toBe(200);
    expect(r.body.yearMonth).toBe('2025-06');
    expect(r.body.total).toBe(8000);
    expect(Array.isArray(r.body.byCategory)).toBe(true);
    expect(Array.isArray(r.body.byUser)).toBe(true);
    expect(r.body.byUser.length).toBeGreaterThanOrEqual(2);
  });

  test('employee は自分のみ集計', async () => {
    const r = await request(app).get('/api/reports/summary?yearMonth=2025-06')
      .set('Authorization', `Bearer ${empToken}`);
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(3000);
    expect(r.body.byUser.length).toBe(1);
    expect(r.body.byUser[0].userId).toBe(empId);
  });
});
