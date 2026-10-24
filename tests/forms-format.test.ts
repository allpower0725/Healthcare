import { describe, expect, it } from 'vitest';
import {
  ageOn,
  checkTwId,
  clampDay,
  clampMonth,
  rocToIso,
  splitPhone,
  splitSuffix,
  todayIsoTaipei,
  todayRoc,
} from '@/lib/forms/format';

describe('身分證號', () => {
  it('本國身分證檢查碼', () => {
    expect(checkTwId('A123456789')).toEqual({ ok: true, foreign: false });
    expect(checkTwId('A234567893').ok).toBe(true);
    expect(checkTwId('A123456788').ok).toBe(false);
  });

  it('新式與舊式統一證號', () => {
    expect(checkTwId('A800000014')).toEqual({ ok: true, foreign: true });
    expect(checkTwId('AB12345678')).toEqual({ ok: true, foreign: true });
  });

  it('格式不符', () => {
    expect(checkTwId('12345').ok).toBe(false);
  });
});

describe('民國日期', () => {
  it('轉成西元 ISO 日期', () => {
    expect(rocToIso('72', '5', '18')).toBe('1983-05-18');
    expect(rocToIso('115', '10', '24')).toBe('2026-10-24');
  });

  it('不存在的日期與格式錯誤回傳 null', () => {
    expect(rocToIso('115', '2', '30')).toBeNull();
    expect(rocToIso('0', '1', '1')).toBeNull();
    expect(rocToIso('72', '', '18')).toBeNull();
    expect(rocToIso('1983', '5', '18')).toBeNull();
  });

  it('台灣時間的今天', () => {
    // UTC 10/24 18:00＝台灣 10/25 02:00
    const now = new Date('2026-10-24T18:00:00Z');
    expect(todayIsoTaipei(now)).toBe('2026-10-25');
    expect(todayRoc(now)).toEqual({ y: '115', m: '10', d: '25' });
  });

  it('足歲', () => {
    expect(ageOn('1983-05-18', '2026-05-17')).toBe(42);
    expect(ageOn('1983-05-18', '2026-05-18')).toBe(43);
  });
});

describe('日期輸入上限', () => {
  it('月份超過 12 固定為 12；00 改為 01；輸入中的 0、1 保留', () => {
    expect(clampMonth('13')).toBe('12');
    expect(clampMonth('99')).toBe('12');
    expect(clampMonth('12')).toBe('12');
    expect(clampMonth('00')).toBe('01');
    expect(clampMonth('0')).toBe('0');
    expect(clampMonth('1')).toBe('1');
    expect(clampMonth('')).toBe('');
  });

  it('日期依年月的天數固定在最大值', () => {
    expect(clampDay('32', '115', '1')).toBe('31');
    expect(clampDay('31', '115', '4')).toBe('30');
    expect(clampDay('30', '115', '2')).toBe('28');
    expect(clampDay('30', '113', '2')).toBe('29');
    expect(clampDay('15', '115', '2')).toBe('15');
    expect(clampDay('00', '115', '2')).toBe('01');
    expect(clampDay('3', '115', '2')).toBe('3');
  });

  it('年或月還沒填好時，以可能的最大天數為上限', () => {
    expect(clampDay('32', '', '')).toBe('31');
    expect(clampDay('30', '', '2')).toBe('29');
    expect(clampDay('31', '', '6')).toBe('30');
    expect(clampDay('31', '115', '')).toBe('31');
  });
});

describe('列印用拆分', () => {
  it('縣市、鄉鎮的單位字', () => {
    expect(splitSuffix('臺中市', ['縣', '市'])).toEqual({ base: '臺中', sfx: '市' });
    expect(splitSuffix('烏日區', ['鄉', '鎮', '市', '區'])).toEqual({ base: '烏日', sfx: '區' });
    expect(splitSuffix('市', ['市'])).toEqual({ base: '市', sfx: '' });
  });

  it('電話拆成區碼與號碼', () => {
    expect(splitPhone('0912345678')).toEqual({ area: '0912', num: '345678' });
    expect(splitPhone('04-23456789')).toEqual({ area: '04', num: '23456789' });
    expect(splitPhone('(02)2345-6789')).toEqual({ area: '02', num: '2345-6789' });
    expect(splitPhone('0423456789')).toEqual({ area: '04', num: '23456789' });
  });
});
