import { randomBytes, scrypt, type ScryptOptions, timingSafeEqual } from 'node:crypto';

// 雜湊格式：scrypt:N:r:p:鹽:雜湊（base64url）
// 不用 $ 分隔，因為 Next 讀 .env 時會把 $xxx 當成變數展開
const PARAMS = { N: 2 ** 15, r: 8, p: 1 };
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;

function derive(password: string, salt: Buffer, params: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password.normalize('NFC'), salt, KEY_LENGTH, { ...params, maxmem: MAX_MEMORY }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64url'), key.toString('base64url')].join(':');
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [N, r, p] = parts.slice(1, 4).map(Number);
  const salt = Buffer.from(parts[4], 'base64url');
  const expected = Buffer.from(parts[5], 'base64url');
  if (![N, r, p].every(Number.isInteger) || salt.length === 0 || expected.length !== KEY_LENGTH) return false;

  try {
    return timingSafeEqual(await derive(password, salt, { N, r, p }), expected);
  } catch {
    return false;
  }
}
