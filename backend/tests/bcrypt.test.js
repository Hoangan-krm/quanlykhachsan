import { hashPassword, comparePassword } from '../utils/bcrypt.js';

describe('bcrypt utilities', () => {
  test('hashPassword should produce a hash different from plaintext', async () => {
    const hash = await hashPassword('TestPassword123!');
    expect(hash).not.toBe('TestPassword123!');
    expect(hash).toMatch(/^\$2b\$/);
  });

  test('comparePassword should verify correct password', async () => {
    const hash = await hashPassword('MySecret123!');
    const isMatch = await comparePassword('MySecret123!', hash);
    expect(isMatch).toBe(true);
  });

  test('comparePassword should reject wrong password', async () => {
    const hash = await hashPassword('CorrectPassword!');
    const isMatch = await comparePassword('WrongPassword!', hash);
    expect(isMatch).toBe(false);
  });

  test('hashPassword should produce different hashes for same input (salt)', async () => {
    const hash1 = await hashPassword('SamePassword!');
    const hash2 = await hashPassword('SamePassword!');
    expect(hash1).not.toBe(hash2);
  });
});
