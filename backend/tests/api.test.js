const request = require('supertest');
const { createApp } = require('../src/app');

const app = createApp();

describe('API Endpoints', () => {
  it('should return 200 for health check', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('OK');
  });

  it('should signup a new user', async () => {
    const res = await request(app)
      .post('/signup')
      .send({ username: 'testuser', password: 'testpass' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.username).toBe('testuser');
  });

  it('should not signup with existing username', async () => {
    await request(app).post('/signup').send({ username: 'dupeuser', password: 'pass1' });
    const res = await request(app).post('/signup').send({ username: 'dupeuser', password: 'pass2' });
    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should login with correct credentials', async () => {
    await request(app).post('/signup').send({ username: 'loginuser', password: 'loginpass' });
    const res = await request(app).post('/login').send({ username: 'loginuser', password: 'loginpass' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should not login with wrong credentials', async () => {
    const res = await request(app).post('/login').send({ username: 'nouser', password: 'badpass' });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
