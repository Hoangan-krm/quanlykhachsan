import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

export async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
