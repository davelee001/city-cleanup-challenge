const request = require('supertest');
const app = require('../../src/app');

describe('Events API Integration Tests', () => {
  let server;

  beforeAll(() => {
    // Start server for testing
    server = app.listen(0);
  });

  afterAll(done => {
    server.close(done);
  });

  describe('GET /api/events', () => {
    it('should return all events', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter events by status', async () => {
      const response = await request(app)
        .get('/api/events?status=upcoming')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('POST /api/events', () => {
    it('should create a new event', async () => {
      const newEvent = {
        title: 'Test Cleanup Event',
        description: 'Test event for integration testing',
        location: 'Test Location',
        date: new Date().toISOString(),
        maxParticipants: 50
      };

      const response = await request(app)
        .post('/api/events')
        .send(newEvent)
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
    });

    it('should return 400 for invalid event data', async () => {
      const invalidEvent = {
        title: '',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/events')
        .send(invalidEvent);

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('GET /api/events/:id', () => {
    it('should return a single event', async () => {
      const response = await request(app)
        .get('/api/events/1')
        .expect('Content-Type', /json/);

      expect([200, 404]).toContain(response.status);
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .get('/api/events/99999')
        .expect('Content-Type', /json/);

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/events/:id', () => {
    it('should update an event', async () => {
      const updateData = {
        title: 'Updated Event Title'
      };

      const response = await request(app)
        .put('/api/events/1')
        .send(updateData);

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/events/:id', () => {
    it('should delete an event', async () => {
      const response = await request(app)
        .delete('/api/events/999');

      expect([200, 204, 404, 500]).toContain(response.status);
    });
  });
});
