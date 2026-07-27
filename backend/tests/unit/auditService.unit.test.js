const {
  classifyRequest,
  hashValue,
  sanitizePath,
} = require('../../src/services/auditService');

describe('system audit classification and privacy', () => {
  it.each([
    ['/api/v1/login', 'POST', null, 'authentication'],
    ['/api/v1/admin/users', 'GET', { role: 'admin' }, 'administration'],
    ['/api/v1/evidence/submissions/12/review', 'PATCH', { role: 'admin' }, 'moderation'],
    ['/api/v1/events/12', 'DELETE', { role: 'user' }, 'destructive'],
    ['/api/v1/admin/users/12', 'DELETE', { role: 'admin' }, 'destructive'],
  ])('classifies %s as %s activity', (originalUrl, method, user, expected) => {
    expect(classifyRequest({ originalUrl, method, user })).toBe(expected);
  });

  it('does not audit ordinary reads and removes query strings', () => {
    expect(classifyRequest({
      originalUrl: '/api/v1/posts?cursor=secret',
      method: 'GET',
      user: { role: 'user' },
    })).toBeNull();
    expect(sanitizePath('/api/v1/posts?cursor=secret')).toBe('/api/v1/posts');
  });

  it('uses a keyed one-way hash for network metadata', () => {
    const first = hashValue('192.0.2.1', 'a'.repeat(32));
    const second = hashValue('192.0.2.1', 'b'.repeat(32));
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toBe(second);
    expect(hashValue('192.0.2.1', '')).toBeNull();
  });
});
