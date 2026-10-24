import { describe, expect, it } from 'vitest';
import { formatDateTime, fromTaipeiInput, toTaipeiInput } from '@/lib/time';

describe('台灣時間', () => {
  it('datetime-local 的值視為台灣時間', () => {
    expect(fromTaipeiInput('2026-11-01T08:30')?.toISOString()).toBe('2026-11-01T00:30:00.000Z');
    expect(fromTaipeiInput('2027-01-01T00:00')?.toISOString()).toBe('2026-12-31T16:00:00.000Z');
  });

  it('空值與格式錯誤回傳 null', () => {
    expect(fromTaipeiInput('')).toBeNull();
    expect(fromTaipeiInput('2026-11-01')).toBeNull();
    expect(fromTaipeiInput('2026-13-01T08:00')).toBeNull();
    expect(fromTaipeiInput('2026-02-30T08:00')).toBeNull();
    expect(fromTaipeiInput('not a date')).toBeNull();
  });

  it('轉回 datetime-local 的值', () => {
    expect(toTaipeiInput(new Date('2026-11-01T00:30:00Z'))).toBe('2026-11-01T08:30');
    expect(toTaipeiInput(new Date('2026-12-31T16:00:00Z'))).toBe('2027-01-01T00:00');
    expect(toTaipeiInput(null)).toBe('');
  });

  it('顯示格式', () => {
    expect(formatDateTime(new Date('2026-11-01T00:30:00Z'))).toBe('2026/11/01 08:30');
    expect(formatDateTime(null)).toBe('—');
  });
});
