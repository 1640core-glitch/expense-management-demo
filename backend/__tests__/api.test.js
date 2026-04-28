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

let approverToken, adminToken;

beforeAll(async () => {
  makeUser('approver@test.com', 'approver');
  makeUser('admin@test.com', 'admin');
  approverToken = await loginAs('approver@test.com');
  adminToken = await loginAs('admin@test.com');
});

describe('認証', () => {
  test('register → login → me', async () => {
    const reg = await request(app).post('/api/auth/register')
      .send({ email: 'emp1@test.com', password: 'password123', name: 'Emp1' });
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeTruthy();
    expect(reg.body.user.role).toBe('employee');

    const login = await request(app).post('/api/auth/login')
      .send({ email: 'emp1@test.com', password: 'password123' });
    expect(login.status).toBe(200);

    const me = await request(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe('emp1@test.com');
  });

  test('login 失敗', async () => {
    const r = await request(app).post('/api/auth/login')
      .send({ email: 'emp1@test.com', password: 'wrong' });
    expect(r.status).toBe(401);
  });

  test('未認証は 401', async () => {
    const r = await request(app).get('/api/auth/me');
    expect(r.status).toBe(401);
  });

  test('権限不足は 403', async () => {
    const tok = (await request(app).post('/api/auth/login')
      .send({ email: 'emp1@test.com', password: 'password123' })).body.token;
    const r = await request(app).get('/api/reports/monthly?year=2024&month=1')
      .set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(403);
  });
});

describe('経費 CRUD と承認', () => {
  let empToken, expenseId;

  beforeAll(async () => {
    await request(app).post('/api/auth/register')
      .send({ email: 'emp2@test.com', password: 'password123', name: 'Emp2' });
    empToken = await loginAs('emp2@test.com');
  });

  test('draft → submit → approve', async () => {
    const create = await request(app).post('/api/expenses')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ category_id: 1, title: '電車代', amount: 1000, expense_date: '2024-05-15' });
    expect(create.status).toBe(201);
    expect(create.body.status).toBe('draft');
    expenseId = create.body.id;

    const sub = await request(app).post(`/api/expenses/${expenseId}/submit`)
      .set('Authorization', `Bearer ${empToken}`);
    expect(sub.status).toBe(200);
    expect(sub.body.status).toBe('pending');

    const ap = await request(app).post(`/api/expenses/${expenseId}/approve`)
      .set('Authorization', `Bearer ${approverToken}`)
      .send({ comment: 'OK' });
    expect(ap.status).toBe(200);
    expect(ap.body.status).toBe('approved');

    const apr = db.prepare('SELECT * FROM approvals WHERE expense_id = ?').get(expenseId);
    expect(apr.action).toBe('approve');
    expect(apr.comment).toBe('OK');
  });

  test('reject 正常系', async () => {
    const c = await request(app).post('/api/expenses')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ category_id: 2, amount: 5000, expense_date: '2024-05-20' });
    await request(app).post(`/api/expenses/${c.body.id}/submit`)
      .set('Authorization', `Bearer ${empToken}`);
    const rj = await request(app).post(`/api/expenses/${c.body.id}/reject`)
      .set('Authorization', `Bearer ${approverToken}`)
      .send({ comment: 'NG' });
    expect(rj.status).toBe(200);
    expect(rj.body.status).toBe('rejected');
  });

  test('pending 以外は 400', async () => {
    const c = await request(app).post('/api/expenses')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ category_id: 1, amount: 100, expense_date: '2024-05-21' });
    const r = await request(app).post(`/api/expenses/${c.body.id}/approve`)
      .set('Authorization', `Bearer ${approverToken}`);
    expect(r.status).toBe(400);
  });

  test('一般ユーザーは承認不可 (403)', async () => {
    const r = await request(app).post(`/api/expenses/${expenseId}/approve`)
      .set('Authorization', `Bearer ${empToken}`);
    expect(r.status).toBe(403);
  });

  test('存在しない経費は 404', async () => {
    const r = await request(app).post('/api/expenses/99999/approve')
      .set('Authorization', `Bearer ${approverToken}`);
    expect(r.status).toBe(404);
  });
});

describe('レポート集計', () => {
  beforeAll(async () => {
    await request(app).post('/api/auth/register')
      .send({ email: 'emp3@test.com', password: 'password123', name: 'Emp3' });
    const tok = await loginAs('emp3@test.com');
    const items = [
      { category_id: 1, amount: 2000, expense_date: '2024-06-01' },
      { category_id: 1, amount: 3000, expense_date: '2024-06-15' },
      { category_id: 2, amount: 5000, expense_date: '2024-06-20' },
      { category_id: 1, amount: 9999, expense_date: '2024-07-01' },
    ];
    for (const it of items) {
      const c = await request(app).post('/api/expenses')
        .set('Authorization', `Bearer ${tok}`).send(it);
      await request(app).post(`/api/expenses/${c.body.id}/submit`)
        .set('Authorization', `Bearer ${tok}`);
      await request(app).post(`/api/expenses/${c.body.id}/approve`)
        .set('Authorization', `Bearer ${approverToken}`);
    }
  });

  test('monthly 集計', async () => {
    const r = await request(app).get('/api/reports/monthly?year=2024&month=6')
      .set('Authorization', `Bearer ${approverToken}`);
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(10000);
    const cat1 = r.body.categories.find(c => c.category_id === 1);
    const cat2 = r.body.categories.find(c => c.category_id === 2);
    expect(cat1.total).toBe(5000);
    expect(cat1.count).toBe(2);
    expect(cat2.total).toBe(5000);
  });

  test('csv ダウンロード', async () => {
    const r = await request(app).get('/api/reports/csv?year=2024&month=6')
      .set('Authorization', `Bearer ${approverToken}`);
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toMatch(/text\/csv/);
    expect(r.text.charCodeAt(0)).toBe(0xFEFF);
    expect(r.text).toMatch(/日付/);
    expect(r.text).toMatch(/カテゴリ/);
  });

  test('admin 権限でアクセス可', async () => {
    const r = await request(app).get('/api/reports/monthly?year=2024&month=6')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
  });

  test('year/month 不正は 400', async () => {
    const r = await request(app).get('/api/reports/monthly?year=2024')
      .set('Authorization', `Bearer ${approverToken}`);
    expect(r.status).toBe(400);
  });
});
