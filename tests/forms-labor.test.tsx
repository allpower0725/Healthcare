import { renderToStaticMarkup } from 'react-dom/server';
import { eq, sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { formSettings } from '@/db/schema';
import { FormContext } from '@/components/forms/context';
import { useFormState } from '@/components/forms/use-form-state';
import { LaborPublic } from '@/forms/labor/public';
import { LaborPrint } from '@/forms/labor/print';
import { getFormUi } from '@/forms/registry';
import { getFormPrint } from '@/forms/print-registry';
import { FORM_IDS } from '@/lib/forms/catalog';
import { laborDef } from '@/lib/forms/defs/labor';
import { sanitize, validateRules } from '@/lib/forms/engine';
import { parseQuery } from '@/lib/submissions/query';
import { completeSubmission, createPublicSubmission, getSubmission, resubmitPublic, returnToPublic, searchSubmissions } from '@/lib/submissions/service';
import { laborPublicSample } from './fixtures';
import { createUser, resetDb } from './helpers';

const errors = (extra: Record<string, string | string[]> = {}) => validateRules(laborDef.publicRules, sanitize(laborDef, 'public', { ...laborPublicSample(), ...extra }));

describe('勞工健康檢查欄位', () => {
  it('最小完整問卷不要求原表沒有的地址、電話、教育及簽名', () => {
    expect(errors()).toEqual({});
    expect(Object.values(laborDef.fields).some((field) => field.kind === 'image')).toBe(false);
    expect(Object.keys(sanitize(laborDef, 'staff', {}))).toEqual([]);
  });
  it('email 選填，有填須為正確格式且與基本資料一起保留', () => {
    expect(errors({ 'profile.email': '' })).toEqual({});
    expect(errors({ 'profile.email': 'invalid' })).toHaveProperty('profile.email');
    expect(sanitize(laborDef, 'public', laborPublicSample())['profile.email']).toBe('labor@example.com');
  });
  it.each(['profile.name', 'profile.sex', 'profile.idNo', 'labor.company', 'labor.reason', 'labor.currentHas', 'labor.previousHas', 'labor.smoke', 'labor.betel', 'labor.drink'])('%s 不可空白', (key) => {
    expect(errors({ [key]: '' })).toHaveProperty(key);
  });
  it.each(['labor.diseases', 'labor.symptoms'])('%s 需明確選擇；以上皆無與其他答案互斥', (key) => {
    expect(errors({ [key]: [] })).toHaveProperty(key);
    const picked = key.endsWith('diseases') ? 'heart' : 'headache';
    expect(sanitize(laborDef, 'public', { [key]: ['none', picked] })[key]).toEqual([picked]);
  });
  it('工作有無控制工作明細，無工作時清除輪班與多層隱藏答案', () => {
    const cleaned = sanitize(laborDef, 'public', { 'labor.currentHas': 'N', 'labor.currentTitle': '舊工作', 'labor.currentStartY': '100', 'labor.shift': 'Y', 'labor.shiftType': 'other', 'labor.shiftOther': '舊班制' });
    expect(cleaned).toMatchObject({ 'labor.currentTitle': '', 'labor.currentStartY': '', 'labor.shift': '', 'labor.shiftType': '', 'labor.shiftOther': '' });
    expect(errors({ 'labor.currentHas': 'Y' })).toHaveProperty('labor.currentTitle');
    expect(errors({ 'labor.currentHas': 'Y', 'labor.currentTitle': '護理師', 'labor.shift': 'N' })).toEqual({});
  });
  it('輪班選其他時需說明，僅保留適用說明', () => {
    const base = { 'labor.currentHas': 'Y', 'labor.currentTitle': '護理師', 'labor.shift': 'Y', 'labor.shiftType': 'other' };
    expect(errors(base)).toHaveProperty('labor.shiftOther');
    expect(errors({ ...base, 'labor.shiftOther': '彈性輪班' })).toEqual({});
    expect(sanitize(laborDef, 'public', { ...base, 'labor.shiftType': 'three', 'labor.shiftOther': '舊值' })['labor.shiftOther']).toBe('');
  });
  it('作業年月須完整有效且起訖有序，可保留在職時空白的截止年月', () => {
    const base = { 'labor.previousHas': 'Y', 'labor.previousTitle': '行政', 'labor.previousStartY': '100' };
    expect(errors(base)).toHaveProperty('labor.previousDates');
    expect(errors({ ...base, 'labor.previousStartM': '13' })).toHaveProperty('labor.previousDates');
    expect(errors({ ...base, 'labor.previousStartM': '5' })).toEqual({});
    expect(errors({ ...base, 'labor.previousStartM': '5', 'labor.previousEndY': '99', 'labor.previousEndM': '12' })).toHaveProperty('labor.previousDates');
  });
  it('受僱與檢查日期選填，但部分日期與不存在日期需修正', () => {
    expect(errors({ 'labor.hiredY': '115' })).toHaveProperty('labor.hired');
    expect(errors({ 'labor.examY': '115', 'labor.examM': '2', 'labor.examD': '30' })).toHaveProperty('labor.exam');
    expect(errors({ 'labor.examY': '115', 'labor.examM': '11', 'labor.examD': '4' })).toEqual({});
  });
  it('年資及已戒期間允許 0 年 0 月，但不得省略半組或超過 11 月', () => {
    expect(errors({ 'labor.smoke': 'quit', 'labor.smokeQuitY': '0', 'labor.smokeQuitM': '0' })).toEqual({});
    expect(errors({ 'labor.smoke': 'quit', 'labor.smokeQuitY': '1' })).toHaveProperty('labor.smokeQuit');
    expect(errors({ 'labor.smoke': 'quit', 'labor.smokeQuitY': '1', 'labor.smokeQuitM': '12' })).toHaveProperty('labor.smokeQuit');
  });
  it('數值接受小數，拒絕超出時數、負數、無效小數', () => {
    expect(errors({ 'labor.hours1m': '40.5', 'labor.sleep': '7.5' })).toEqual({});
    expect(errors({ 'labor.hours1m': '169' })).toHaveProperty('labor.hours1m');
    expect(errors({ 'labor.sleep': '25' })).toHaveProperty('labor.sleep');
    expect(errors({ 'labor.hours6m': '-1' })).toHaveProperty('labor.hours6m');
    expect(errors({ 'labor.sleep': '7..5' })).toHaveProperty('labor.sleep');
  });
  it('每天喝酒需填頻率、酒類與瓶數；改為從未時清除舊明細', () => {
    expect(errors({ 'labor.drink': 'daily' })).toHaveProperty('labor.drinkType');
    expect(errors({ 'labor.drink': 'daily', 'labor.drinkAmount': '7', 'labor.drinkType': '啤酒', 'labor.drinkBottles': '0.5' })).toEqual({});
    expect(sanitize(laborDef, 'public', { 'labor.drink': 'never', 'labor.drinkAmount': '7', 'labor.drinkType': '啤酒', 'labor.drinkBottles': '1' })).toMatchObject({ 'labor.drinkAmount': '', 'labor.drinkType': '', 'labor.drinkBottles': '' });
  });
  it('需說明的疾病與其他症狀不能空白', () => {
    expect(errors({ 'labor.diseases': ['cancer'] })).toHaveProperty('labor.cancerDetail');
    expect(errors({ 'labor.symptoms': ['other'] })).toHaveProperty('labor.symptomOther');
  });
  it('填寫順序依使用者調整，但紙本維持原 PDF；email 不新增到紙本', () => {
    function Preview() {
      const form = useFormState(laborDef, { ...laborPublicSample(), 'labor.currentHas': 'Y', 'labor.previousHas': 'Y' }, { rules: laborDef.publicRules });
      return <FormContext.Provider value={form.ctx}><LaborPublic prefilled={false} /></FormContext.Provider>;
    }
    const html = renderToStaticMarkup(<Preview />);
    expect(html.indexOf('作業經歷與檢查時期')).toBeLessThan(html.indexOf('受僱日期（選填）'));
    expect(html.indexOf('目前從事的工作')).toBeLessThan(html.indexOf('曾經從事的工作'));
    expect(html).toContain('只需填寫最近一項');
    expect(html).toContain('例如：烏日澄清醫院');
    expect(html).toContain('name="profile.email"');
    const printed = renderToStaticMarkup(<LaborPrint data={laborPublicSample()} />);
    expect(printed).toContain('測試事業單位');
    expect(printed).not.toContain('labor@example.com');
    expect(printed.match(/class="ps-page"/g)).toHaveLength(1);
    expect(getFormUi('labor')).not.toBeNull();
    expect(getFormPrint('labor')).not.toBeNull();
  });
});

describe('勞工健檢送出與協同', () => {
  beforeEach(resetDb);
  it('新增設定預設關閉，首次篩選包含第七張表單', async () => {
    expect(await db.select().from(formSettings).where(eq(formSettings.formId, 'labor'))).toMatchObject([{ isOpen: false }]);
    expect(FORM_IDS).toHaveLength(7);
    expect(parseQuery({}).forms).toContain('labor');
  });
  it('未知代號仍受資料庫約束保護', async () => {
    await expect(db.execute(sql`insert into heal_form_settings (form_id) values ('unknown-form')`)).rejects.toThrow();
  });
  it('送出可查詢 email，退回與重送沿用編號，院所可直接確認並保留完成者', async () => {
    await db.update(formSettings).set({ isOpen: true }).where(eq(formSettings.formId, 'labor'));
    const raw = laborPublicSample();
    const first = await createPublicSubmission('labor', raw, 'labor-device');
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error('submit failed');
    const original = (await getSubmission(first.id))!;
    expect(original.publicData['profile.email']).toBe('labor@example.com');
    expect((await searchSubmissions(parseQuery({ form: 'labor', status: 'submitted', id: '測試勞工' }))).total).toBe(1);
    expect(await returnToPublic(first.id, 'labor-device')).toMatchObject({ ok: true });
    expect(await resubmitPublic(first.id, 'labor-device', { ...raw, 'labor.company': '新的事業單位' }, new Date(), original.publicSubmittedAt.toISOString())).toMatchObject({ ok: true });
    expect(await createPublicSubmission('labor', { ...raw, 'labor.company': '新的事業單位' }, 'labor-device')).toEqual({ ok: true, id: first.id });
    const latest = (await getSubmission(first.id))!;
    const staff = await createUser();
    expect(await completeSubmission(staff.id, first.id, latest.version, {})).toMatchObject({ ok: true });
    expect(await getSubmission(first.id)).toMatchObject({ status: 'completed', completedBy: staff.id, staffData: {} });
    expect((await getSubmission(first.id))?.completedAt).not.toBeNull();
  });
});
