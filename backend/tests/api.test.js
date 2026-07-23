const request = require('supertest');
const { createApp } = require('../src/app');

const app = createApp();
const suffix = `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 7)}`;
const signupData = (username, overrides = {}) => ({
  username,
  password: 'test-password',
  email: `${username}@example.com`,
  phone: '+256 700 123 456',
  location: 'Kampala, Uganda',
  ...overrides,
});

describe('API Endpoints', () => {
  it('should return 200 for health check', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should signup a new user', async () => {
    const res = await request(app)
      .post('/api/v1/signup')
      .send(signupData(`testuser-${suffix}`));
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe(`testuser-${suffix}`);
  });

  it('should not signup with existing username', async () => {
    const username = `dupeuser-${suffix}`;
    await request(app).post('/api/v1/signup').send({ username, password: 'first-password' });
    const res = await request(app).post('/api/v1/signup').send({ username, password: 'second-password' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should login with correct credentials', async () => {
    const username = `loginuser-${suffix}`;
    await request(app).post('/api/v1/signup').send({ username, password: 'login-password' });
    const res = await request(app).post('/api/v1/login').send({ username, password: 'login-password' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should not login with wrong credentials', async () => {
    const res = await request(app).post('/api/v1/login').send({ username: `nouser-${suffix}`, password: 'wrong-password' });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
