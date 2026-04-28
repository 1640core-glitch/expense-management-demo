const path = require('path');
const fs = require('fs');
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

async function createExpense(token) {
  const r = await request(app).post('/api/expenses')
    .set('Authorization', `Bearer ${token}`)
    .field('category_id', '1')
    .field('amount', '1000')
    .field('expense_date', '2024-01-01')
    .field('title', 'テスト経費');
  return r.body;
}

describe('添付ファイル API', () => {
  let tokenA, tokenB, userA;

  beforeAll(async () => {
    const a = await registerAndLogin('attA@test.com');
    const b = await registerAndLogin('attB@test.com');
    tokenA = a.token; userA = a.user;
    tokenB = b.token;
  });

  test('POST → GET で添付が返却される', async () => {
    const exp = await createExpense(tokenA);
    const buf = Buffer.from('hello');
    const post = await request(app).post(`/api/expenses/${exp.id}/attachments`)
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', buf, { filename: 'a.png', contentType: 'image/png' });
    expect(post.status).toBe(201);
    expect(post.body.expense_id).toBe(exp.id);
    expect(post.body.filename).toBe('a.png');

    const get = await request(app).get(`/api/expenses/${exp.id}/attachments`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(get.status).toBe(200);
    expect(get.body.length).toBeGreaterThanOrEqual(1);
    expect(get.body.some((r) => r.id === post.body.id)).toBe(true);
  });

  test('他ユーザーの経費にはアップロード不可 (403)', async () => {
    const exp = await createExpense(tokenA);
    const buf = Buffer.from('x');
    const r = await request(app).post(`/api/expenses/${exp.id}/attachments`)
      .set('Authorization', `Bearer ${tokenB}`)
      .attach('file', buf, { filename: 'b.png', contentType: 'image/png' });
    expect(r.status).toBe(403);
  });

  test('receipt_path がある場合は擬似行をマージ (後方互換)', async () => {
    const exp = await createExpense(tokenA);
    db.prepare('UPDATE expenses SET receipt_path = ? WHERE id = ?').run('legacy-receipt.png', exp.id);

    const get = await request(app).get(`/api/expenses/${exp.id}/attachments`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(get.status).toBe(200);
    expect(get.body.length).toBeGreaterThanOrEqual(1);
    const legacy = get.body.find((r) => r.legacy === true);
    expect(legacy).toBeTruthy();
    expect(legacy.path).toBe('legacy-receipt.png');
  });

  test('draft でない経費の添付は削除不可 (400)', async () => {
    const exp = await createExpense(tokenA);
    const post = await request(app).post(`/api/expenses/${exp.id}/attachments`)
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from('z'), { filename: 'c.png', contentType: 'image/png' });
    expect(post.status).toBe(201);
    db.prepare('UPDATE expenses SET status = ? WHERE id = ?').run('pending', exp.id);
    const del = await request(app).delete(`/api/expenses/${exp.id}/attachments/${post.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(del.status).toBe(400);
  });

  test('draft の添付は削除可能で物理ファイルも消える', async () => {
    const exp = await createExpense(tokenA);
    const post = await request(app).post(`/api/expenses/${exp.id}/attachments`)
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from('d'), { filename: 'd.png', contentType: 'image/png' });
    expect(post.status).toBe(201);
    const filePath = path.join(__dirname, '..', 'uploads', post.body.path);
    expect(fs.existsSync(filePath)).toBe(true);

    const del = await request(app).delete(`/api/expenses/${exp.id}/attachments/${post.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(del.status).toBe(200);
    expect(fs.existsSync(filePath)).toBe(false);
  });
});
