const request = require('supertest');
const { createApp } = require('../../src/app');

const app = createApp();

describe('Events API integration', () => {
  const username = `event-owner-${Date.now()}`;
  const password = 'event-password';
  let accessToken;
  let eventId;

  beforeAll(async () => {
    await request(app).post('/api/v1/signup').send({
      username,
      password,
      email: `${username}@example.com`,
      phone: '+256 700 123 456',
      location: 'Kampala, Uganda',
    });
    const login = await request(app)
      .post('/api/v1/login')
      .send({ username, password });
    accessToken = login.body.tokens.accessToken;
  });

  it('creates an event through the versioned API', async () => {
    const response = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Test Cleanup Event',
        description: 'Test event for integration testing',
        location: 'Test Location',
        latitude: 0,
        longitude: 0,
        date: '2026-08-01',
        time: '09:00'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.event.title).toBe('Test Cleanup Event');
    eventId = response.body.event.id;
  });

  it('lists events through the versioned API', async () => {
    const response = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.events)).toBe(true);
    expect(response.body.events.some(event => event.id === eventId)).toBe(true);
  });

  it('rejects an incomplete event', async () => {
    const response = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Missing required fields' })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('updates an event owned by the requesting user', async () => {
    const response = await request(app)
      .put(`/api/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Updated Cleanup Event',
        description: 'Updated description',
        location: 'Updated Location',
        date: '2026-08-02',
        time: '10:00'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('deletes an event owned by the requesting user', async () => {
    const response = await request(app)
      .delete(`/api/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
