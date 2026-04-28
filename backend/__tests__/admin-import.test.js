const request = require('supertest');
const app = require('../src/server');
const db = require('../src/db');

async function registerAndLogin(email) {
  await request(app).post('/api/auth/register')
    .send({ email, password: 'password123', name: email.split('@')[0] });
  const r = await request(app).post('/api/auth/login')
    .send({ email, password: 'password123' });
  return { token: r.body.token, user: r.body.user };
}

function setRole(userId, role) {
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
}

async function loginAfterRoleChange(email) {
  const r = await request(app).post('/api/auth/login')
    .send({ email, password: 'password123' });
  return r.body.token;
}

describe('管理者向け CSV インポート API', () => {
  let adminToken, empToken, targetUserId, categoryId;

  beforeAll(async () => {
    const admin = await registerAndLogin('imp-admin@test.com');
    setRole(admin.user.id, 'accounting');
    adminToken = await loginAfterRoleChange('imp-admin@test.com');

    const emp = await registerAndLogin('imp-emp@test.com');
    empToken = emp.token;

    const target = await registerAndLogin('imp-target@test.com');
    targetUserId = target.user.id;

    categoryId = db.prepare('SELECT id FROM categories LIMIT 1').get().id;
  });

  test('accounting/admin で CSV インポート成功', async () => {
    const csv = `user_id,category_id,title,amount,expense_date,description\n${targetUserId},${categoryId},タクシー,1500,2024-05-01,出張\n${targetUserId},${categoryId},会食,3200,2024-05-02,\n`;
    const before = db.prepare('SELECT COUNT(*) AS c FROM expenses WHERE user_id = ?').get(targetUserId).c;
    const r = await request(app).post('/api/admin/import/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csv, 'utf8'), { filename: 'in.csv', contentType: 'text/csv' });
    expect(r.status).toBe(200);
    expect(r.body.inserted).toBe(2);
    expect(r.body.errors).toEqual([]);
    const after = db.prepare('SELECT COUNT(*) AS c FROM expenses WHERE user_id = ?').get(targetUserId).c;
    expect(after - before).toBe(2);
  });

  test('employee は 403', async () => {
    const csv = `user_id,category_id,amount,expense_date\n${targetUserId},${categoryId},1000,2024-05-03\n`;
    const r = await request(app).post('/api/admin/import/expenses')
      .set('Authorization', `Bearer ${empToken}`)
      .attach('file', Buffer.from(csv), { filename: 'in.csv', contentType: 'text/csv' });
    expect(r.status).toBe(403);
  });

  test('未認証は 401', async () => {
    const r = await request(app).post('/api/admin/import/expenses')
      .attach('file', Buffer.from('x'), { filename: 'a.csv', contentType: 'text/csv' });
    expect(r.status).toBe(401);
  });

  test('必須ヘッダ欠損は 400', async () => {
    const csv = `user_id,category_id,amount\n${targetUserId},${categoryId},1000\n`;
    const r = await request(app).post('/api/admin/import/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csv), { filename: 'a.csv', contentType: 'text/csv' });
    expect(r.status).toBe(400);
  });

  test('不正行は errors に蓄積され、正常行のみ INSERT', async () => {
    const csv = `user_id,category_id,title,amount,expense_date,description\n${targetUserId},${categoryId},ok,500,2024-06-01,\n${targetUserId},${categoryId},bad-amount,abc,2024-06-02,\n${targetUserId},99999,bad-cat,500,2024-06-03,\n`;
    const r = await request(app).post('/api/admin/import/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csv), { filename: 'a.csv', contentType: 'text/csv' });
    expect(r.status).toBe(200);
    expect(r.body.inserted).toBe(1);
    expect(r.body.errors.length).toBe(2);
    expect(r.body.errors[0].line).toBe(3);
    expect(r.body.errors[1].line).toBe(4);
  });

  test('file フィールド欠落は 400', async () => {
    const r = await request(app).post('/api/admin/import/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('dummy', 'x');
    expect(r.status).toBe(400);
  });
});
