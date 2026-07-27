const {
  isBcryptHash,
} = require('../../scripts/migrate-plaintext-passwords');

describe('plaintext password migration', () => {
  it('recognizes supported bcrypt hashes', () => {
    expect(isBcryptHash('$2b$12$abcdefghijklmnopqrstuu1234567890123456789012345678901')).toBe(true);
  });

  it.each([
    'password123',
    '',
    '$2b$04$short',
    'pbkdf2:not-supported',
  ])('flags non-bcrypt retained value: %s', (value) => {
    expect(isBcryptHash(value)).toBe(false);
  });
});
