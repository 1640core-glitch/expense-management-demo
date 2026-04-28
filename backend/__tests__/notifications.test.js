const request = require('supertest');
const app = require('../src/server');

async function registerAndLogin(email) {
  const reg = await request(app).post('/api/auth/register')
    .send({ email, password: 'password123', name: email.split('@')[0] });
  const r = await request(app).post('/api/auth/login')
    .send({ email, password: 'password123' });
  return { token: r.body.token, userId: reg.body.user.id };
}

describe('通知 API', () => {
  let token, userId;

  beforeAll(async () => {
    const u = await registerAndLogin('notif1@test.com');
    token = u.token;
    userId = u.userId;
  });

  test('POST /api/notifications で作成できる', async () => {
    const r = await request(app).post('/api/notifications')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: userId, type: 'info', payload_json: { msg: 'hello' } });
    expect(r.status).toBe(201);
    expect(r.body.user_id).toBe(userId);
    expect(r.body.type).toBe('info');
  });

  test('GET /api/notifications で自分の一覧が取得できる', async () => {
    const r = await request(app).get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body.every(n => n.user_id === userId)).toBe(true);
  });

  test('PATCH /api/notifications/:id/read で既読化できる', async () => {
    const c = await request(app).post('/api/notifications')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: userId, type: 'info', payload_json: null });
    expect(c.status).toBe(201);
    const r = await request(app).patch(`/api/notifications/${c.body.id}/read`)
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.read_at).not.toBeNull();
  });

  test('POST /api/notifications/read-all で全件既読化できる', async () => {
    await request(app).post('/api/notifications')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: userId, type: 'info', payload_json: null });
    await request(app).post('/api/notifications')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: userId, type: 'info', payload_json: null });
    const r = await request(app).post('/api/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(typeof r.body.updated).toBe('number');

    const list = await request(app).get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.every(n => n.read_at !== null)).toBe(true);
  });
});
