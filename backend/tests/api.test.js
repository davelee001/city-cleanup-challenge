const request = require('supertest');
const { createApp } = require('../src/app');
const db = require('../src/db');

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
    expect(res.body.user.email).toBe(`testuser-${suffix}@example.com`);
    expect(res.body.user.phone).toBe('+256 700 123 456');
    expect(res.body.user.location).toBe('Kampala, Uganda');
  });

  it('should not signup with existing username', async () => {
    const username = `dupeuser-${suffix}`;
    await request(app).post('/api/v1/signup').send(signupData(username, { password: 'first-password' }));
    const res = await request(app)
      .post('/api/v1/signup')
      .send(signupData(username, {
        password: 'second-password',
        email: `other-${suffix}@example.com`,
      }));
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should login with correct credentials', async () => {
    const username = `loginuser-${suffix}`;
    await request(app).post('/api/v1/signup').send(signupData(username, { password: 'login-password' }));
    const res = await request(app).post('/api/v1/login').send({ username, password: 'login-password' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tokens.accessToken).toBeTruthy();
    expect(res.body.tokens.refreshToken).toBeTruthy();
    expect(res.body.tokens.tokenType).toBe('Bearer');
  });

  it('should reject signup when contact details are missing', async () => {
    const res = await request(app)
      .post('/api/v1/signup')
      .send({ username: `missing-${suffix}`, password: 'test-password' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should not login with wrong credentials', async () => {
    const res = await request(app).post('/api/v1/login').send({ username: `nouser-${suffix}`, password: 'wrong-password' });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('JWT authentication and authorization', () => {
  const owner = `owner-${suffix}`;
  const otherUser = `other-${suffix}`;
  const adminUser = `admin-${suffix}`;
  let ownerTokens;
  let otherTokens;
  let adminTokens;
  let postId;

  beforeAll(async () => {
    await request(app).post('/api/v1/signup').send(signupData(owner));
    await request(app).post('/api/v1/signup').send(signupData(otherUser));
    await request(app).post('/api/v1/signup').send(signupData(adminUser));
    await new Promise((resolve, reject) => {
      db.run('UPDATE users SET role = ? WHERE username = ?', ['admin', adminUser], (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    const ownerLogin = await request(app)
      .post('/api/v1/login')
      .send({ username: owner, password: 'test-password' });
    const otherLogin = await request(app)
      .post('/api/v1/login')
      .send({ username: otherUser, password: 'test-password' });
    const adminLogin = await request(app)
      .post('/api/v1/login')
      .send({ username: adminUser, password: 'test-password' });
    ownerTokens = ownerLogin.body.tokens;
    otherTokens = otherLogin.body.tokens;
    adminTokens = adminLogin.body.tokens;
  });

  it('rejects private endpoints without an access token', async () => {
    const response = await request(app).get('/api/v1/posts');
    expect(response.statusCode).toBe(401);
    expect(response.body.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('rejects invalid access tokens', async () => {
    const response = await request(app)
      .get('/api/v1/posts')
      .set('Authorization', 'Bearer not-a-valid-jwt');
    expect(response.statusCode).toBe(401);
    expect(response.body.code).toBe('INVALID_TOKEN');
  });

  it('accepts a signed access token and derives resource ownership from it', async () => {
    const response = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${ownerTokens.accessToken}`)
      .send({ username: otherUser, content: 'Owned by the access-token user' });
    expect(response.statusCode).toBe(200);
    expect(response.body.post.username).toBe(owner);
    postId = response.body.post.id;
  });

  it('prevents another user from changing an owned resource', async () => {
    const response = await request(app)
      .put(`/api/v1/posts/${postId}`)
      .set('Authorization', `Bearer ${otherTokens.accessToken}`)
      .send({ content: 'Unauthorized update' });
    expect(response.statusCode).toBe(403);
  });

  it('prevents a standard user from accessing admin routes', async () => {
    const response = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${ownerTokens.accessToken}`);
    expect(response.statusCode).toBe(403);
  });

  it('allows a current administrator to access role-protected routes', async () => {
    const response = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('rotates refresh tokens and rejects reuse of the old token', async () => {
    const rotated = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: ownerTokens.refreshToken });
    expect(rotated.statusCode).toBe(200);
    expect(rotated.body.tokens.refreshToken).not.toBe(ownerTokens.refreshToken);

    const reused = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: ownerTokens.refreshToken });
    expect(reused.statusCode).toBe(401);
    expect(reused.body.code).toBe('REFRESH_TOKEN_REUSED');
  });

  it('revokes a refresh token on logout', async () => {
    const login = await request(app)
      .post('/api/v1/login')
      .send({ username: otherUser, password: 'test-password' });
    const refreshToken = login.body.tokens.refreshToken;

    await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken })
      .expect(200);

    await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
