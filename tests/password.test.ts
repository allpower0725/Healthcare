import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('password', () => {
  it('驗證正確密碼、拒絕錯誤密碼', async () => {
    const hash = await hashPassword('正確的密碼 123');
    expect(await verifyPassword('正確的密碼 123', hash)).toBe(true);
    expect(await verifyPassword('錯誤的密碼', hash)).toBe(false);
  });

  it('雜湊不含 $（避免 .env 變數展開），且每次加鹽不同', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toContain('$');
    expect(a.startsWith('scrypt:')).toBe(true);
    expect(a).not.toBe(b);
  });

  it('格式錯誤的雜湊一律驗證失敗', async () => {
    expect(await verifyPassword('x', '')).toBe(false);
    expect(await verifyPassword('x', 'plain-text')).toBe(false);
    expect(await verifyPassword('x', 'scrypt:abc:def')).toBe(false);
  });
});
