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
  let createdId;

  test('POST /api/admin/categories admin で 201, monthlyLimit/isActive を返す', async () => {
    const res = await request(app).post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '会議費', description: '会議関連', monthlyLimit: 50000, isActive: true });
    expect(res.status).toBe(201);
    expect(res.body.category).toBeTruthy();
    expect(res.body.category.name).toBe('会議費');
    expect(res.body.category.monthlyLimit).toBe(50000);
    expect(res.body.category.isActive).toBe(true);
    expect(typeof res.body.category.displayOrder).toBe('number');
    createdId = res.body.category.id;
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

  test('POST displayOrder 未指定で MAX+1 採番される', async () => {
    const before = db.prepare('SELECT COALESCE(MAX(sort_order),0) AS m FROM categories').get().m;
    const res = await request(app).post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '採番テスト1' });
    expect(res.status).toBe(201);
    expect(res.body.category.displayOrder).toBe(before + 1);
  });

  test('POST displayOrder 明示指定で反映される', async () => {
    const res = await request(app).post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '採番テスト2', displayOrder: 999 });
    expect(res.status).toBe(201);
    expect(res.body.category.displayOrder).toBe(999);
  });

  test('PUT /:id 部分更新で 200, camelCase 返却', async () => {
    const updated = await request(app).put(`/api/admin/categories/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ monthlyLimit: 30000, isActive: false });
    expect(updated.status).toBe(200);
    expect(updated.body.category.monthlyLimit).toBe(30000);
    expect(updated.body.category.isActive).toBe(false);
  });

  test('PUT 未存在は 404', async () => {
    const res = await request(app).put('/api/admin/categories/99999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'x' });
    expect(res.status).toBe(404);
  });

  test('GET 一覧 admin 200・配列・displayOrder昇順', async () => {
    const res = await request(app).get('/api/admin/categories?includeInactive=true')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.categories)).toBe(true);
    const orders = res.body.categories.map((c) => c.displayOrder);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]);
    }
  });

  test('GET 一覧 includeInactive=false で is_active=0 が除外される', async () => {
    const res = await request(app).get('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.categories.every((c) => c.isActive === true)).toBe(true);
    expect(res.body.categories.find((c) => c.id === createdId)).toBeUndefined();
  });

  test('GET 一覧 employee は 403', async () => {
    const res = await request(app).get('/api/admin/categories')
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });

  test('GET /:id 200', async () => {
    const res = await request(app).get(`/api/admin/categories/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.category.id).toBe(createdId);
  });

  test('GET /:id 404', async () => {
    const res = await request(app).get('/api/admin/categories/99999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  test('GET /:id employee 403', async () => {
    const res = await request(app).get(`/api/admin/categories/${createdId}`)
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });

  test('PATCH /:id 部分更新 200・camelCase 返却 (displayOrder含む)', async () => {
    const res = await request(app).patch(`/api/admin/categories/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ monthlyLimit: 12345, isActive: true, displayOrder: 50 });
    expect(res.status).toBe(200);
    expect(res.body.category.monthlyLimit).toBe(12345);
    expect(res.body.category.isActive).toBe(true);
    expect(res.body.category.displayOrder).toBe(50);
  });

  test('PATCH /:id 更新項目0件で現値返却', async () => {
    const res = await request(app).patch(`/api/admin/categories/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.category.id).toBe(createdId);
  });

  test('PATCH /:id 未存在 404', async () => {
    const res = await request(app).patch('/api/admin/categories/99999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'x' });
    expect(res.status).toBe(404);
  });

  test('PATCH /:id employee 403', async () => {
    const res = await request(app).patch(`/api/admin/categories/${createdId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ name: 'x' });
    expect(res.status).toBe(403);
  });

  test('DELETE /:id 未参照は 200・再GETで 404', async () => {
    const created = await request(app).post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '削除対象1' });
    const id = created.body.category.id;
    const del = await request(app).delete(`/api/admin/categories/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
    const get = await request(app).get(`/api/admin/categories/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(get.status).toBe(404);
  });

  test('DELETE /:id expenses から参照中は 409', async () => {
    const created = await request(app).post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '削除対象_expense参照' });
    const id = created.body.category.id;
    const userId = db.prepare('SELECT id FROM users WHERE email = ?').get('admincat@test.com').id;
    db.prepare('INSERT INTO expenses (user_id, category_id, amount, expense_date) VALUES (?, ?, ?, ?)')
      .run(userId, id, 1000, '2026-01-01');
    const del = await request(app).delete(`/api/admin/categories/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(409);
  });

  test('DELETE /:id templates から参照中は 409', async () => {
    const created = await request(app).post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '削除対象_template参照' });
    const id = created.body.category.id;
    const userId = db.prepare('SELECT id FROM users WHERE email = ?').get('admincat@test.com').id;
    db.prepare('INSERT INTO templates (user_id, name, category_id, amount) VALUES (?, ?, ?, ?)')
      .run(userId, 'tpl-cat-ref', id, 100);
    const del = await request(app).delete(`/api/admin/categories/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(409);
  });

  test('DELETE /:id 未存在 404', async () => {
    const res = await request(app).delete('/api/admin/categories/99999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  test('DELETE /:id employee 403', async () => {
    const res = await request(app).delete(`/api/admin/categories/${createdId}`)
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });

  test('レスポンスに created_at/updated_at の snake キーが含まれない (命名統一回帰)', async () => {
    const list = await request(app).get('/api/admin/categories?includeInactive=true')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    for (const c of list.body.categories) {
      expect(c).not.toHaveProperty('created_at');
      expect(c).not.toHaveProperty('updated_at');
      expect(c).not.toHaveProperty('monthly_limit');
      expect(c).not.toHaveProperty('is_active');
      expect(c).not.toHaveProperty('sort_order');
      expect(c).toHaveProperty('createdAt');
      expect(c).toHaveProperty('updatedAt');
    }
  });
});
