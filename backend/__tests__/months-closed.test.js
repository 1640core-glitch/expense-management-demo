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

describe('months_closed API', () => {
  let accountingToken, employeeToken;

  beforeAll(async () => {
    makeUser('mc-acct@test.com', 'accounting');
    const r = await request(app).post('/api/auth/register')
      .send({ email: 'mc-emp@test.com', password: 'password123', name: 'mcEmp' });
    employeeToken = r.body.token;
    accountingToken = await loginAs('mc-acct@test.com');
  });

  afterEach(() => {
    db.prepare("DELETE FROM months_closed WHERE year_month LIKE '2030-%'").run();
  });

  test('POST 締め登録 → GET 一覧に含まれる', async () => {
    const post = await request(app).post('/api/admin/months-closed')
      .set('Authorization', `Bearer ${accountingToken}`)
      .send({ year_month: '2030-01' });
    expect(post.status).toBe(201);
    expect(post.body.year_month).toBe('2030-01');

    const list = await request(app).get('/api/admin/months-closed')
      .set('Authorization', `Bearer ${accountingToken}`);
    expect(list.status).toBe(200);
    expect(list.body.some((r) => r.year_month === '2030-01')).toBe(true);
  });

  test('一般ユーザーの POST は 403', async () => {
    const r = await request(app).post('/api/admin/months-closed')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ year_month: '2030-02' });
    expect(r.status).toBe(403);
  });

  test('不正な year_month は 400', async () => {
    const r = await request(app).post('/api/admin/months-closed')
      .set('Authorization', `Bearer ${accountingToken}`)
      .send({ year_month: '2030/03' });
    expect(r.status).toBe(400);
  });

  test('締め登録後 対象月の expense submit は 409 MONTH_CLOSED', async () => {
    await request(app).post('/api/admin/months-closed')
      .set('Authorization', `Bearer ${accountingToken}`)
      .send({ year_month: '2030-04' });

    const create = await request(app).post('/api/expenses')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ category_id: 1, title: 'closed-test', amount: 1000, expense_date: '2030-04-15' });
    expect(create.status).toBe(201);

    const submit = await request(app).post(`/api/expenses/${create.body.id}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(submit.status).toBe(409);
    expect(submit.body.error).toBe('MONTH_CLOSED');
  });

  test('DELETE で解除後 submit は成功', async () => {
    await request(app).post('/api/admin/months-closed')
      .set('Authorization', `Bearer ${accountingToken}`)
      .send({ year_month: '2030-05' });

    const create = await request(app).post('/api/expenses')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ category_id: 1, title: 'reopen-test', amount: 500, expense_date: '2030-05-10' });
    expect(create.status).toBe(201);

    const del = await request(app).delete('/api/admin/months-closed/2030-05')
      .set('Authorization', `Bearer ${accountingToken}`);
    expect(del.status).toBe(200);

    const submit = await request(app).post(`/api/expenses/${create.body.id}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(submit.status).toBe(200);
  });
});
