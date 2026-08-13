import {
  hashPassword,
  PASSWORD_MIN_LENGTH,
  verifyPassword,
} from './password.util';

describe('password hashing', () => {
  it('hashes and verifies passwords without storing plaintext', async () => {
    const password = 'coffee-test-password';
    const hash = await hashPassword(password);

    expect(hash).not.toContain(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('requires the configured minimum length', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });
});
