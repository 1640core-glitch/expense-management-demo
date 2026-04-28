const request = require('supertest');
const app = require('../src/server');

async function registerAndLogin(email) {
  await request(app).post('/api/auth/register')
    .send({ email, password: 'password123', name: email.split('@')[0] });
  const r = await request(app).post('/api/auth/login')
    .send({ email, password: 'password123' });
  return r.body.token;
}

describe('テンプレート CRUD', () => {
  let tokenA, tokenB;

  beforeAll(async () => {
    tokenA = await registerAndLogin('tplA@test.com');
    tokenB = await registerAndLogin('tplB@test.com');
  });

  test('POST 後 GET で一覧に含まれる', async () => {
    const create = await request(app).post('/api/templates')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: '電車定期', categoryId: 1, amount: 1500, title: '電車代', description: '通勤' });
    expect(create.status).toBe(201);
    expect(create.body.name).toBe('電車定期');

    const list = await request(app).get('/api/templates')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(list.status).toBe(200);
    expect(list.body.some(t => t.id === create.body.id)).toBe(true);
  });

  test('name 未指定は 400', async () => {
    const r = await request(app).post('/api/templates')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ categoryId: 1 });
    expect(r.status).toBe(400);
  });

  test('不在 categoryId は 400', async () => {
    const r = await request(app).post('/api/templates')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'x', categoryId: 99999 });
    expect(r.status).toBe(400);
  });

  test('別ユーザー所有テンプレへの PUT/DELETE は 403', async () => {
    const create = await request(app).post('/api/templates')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'A専用', categoryId: 2 });
    expect(create.status).toBe(201);
    const id = create.body.id;

    const put = await request(app).put(`/api/templates/${id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: '上書き' });
    expect(put.status).toBe(403);

    const del = await request(app).delete(`/api/templates/${id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(del.status).toBe(403);
  });

  test('不在 id は 404', async () => {
    const put = await request(app).put('/api/templates/99999')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'x' });
    expect(put.status).toBe(404);
    const del = await request(app).delete('/api/templates/99999')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(del.status).toBe(404);
  });
});
