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

let adminToken, employeeToken;

beforeAll(async () => {
  makeUser('admincat@test.com', 'admin');
  makeUser('empcat@test.com', 'employee');
  adminToken = await loginAs('admincat@test.com');
  employeeToken = await loginAs('empcat@test.com');
});

describe('admin カテゴリ API', () => {
  test('POST /api/admin/categories admin で 201, monthlyLimit/isActive を返す', async () => {
    const res = await request(app).post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '会議費', description: '会議関連', monthlyLimit: 50000, isActive: true });
    expect(res.status).toBe(201);
    expect(res.body.category).toBeTruthy();
    expect(res.body.category.name).toBe('会議費');
    expect(res.body.category.monthlyLimit).toBe(50000);
    expect(res.body.category.isActive).toBe(true);
  });

  test('POST 同名は 409', async () => {
    const res = await request(app).post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '会議費' });
    expect(res.status).toBe(409);
  });

  test('POST name 欠如は 400', async () => {
    const res = await request(app).post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'x' });
    expect(res.status).toBe(400);
  });

  test('POST employee は 403', async () => {
    const res = await request(app).post('/api/admin/categories')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ name: '勉強会費' });
    expect(res.status).toBe(403);
  });

  test('PUT /:id 部分更新で 200, camelCase 返却', async () => {
    const created = await request(app).put('/api/admin/categories/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ monthlyLimit: 30000, isActive: false });
    expect(created.status).toBe(200);
    expect(created.body.category.monthlyLimit).toBe(30000);
    expect(created.body.category.isActive).toBe(false);
  });

  test('PUT 未存在は 404', async () => {
    const res = await request(app).put('/api/admin/categories/99999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'x' });
    expect(res.status).toBe(404);
  });
});
