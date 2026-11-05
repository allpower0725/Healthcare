import { renderToStaticMarkup } from 'react-dom/server';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { formSettings, submissions } from '@/db/schema';
import { FormContext } from '@/components/forms/context';
import { useFormState } from '@/components/forms/use-form-state';
import { LaborPublic } from '@/forms/labor/public';
import { LaborPrint } from '@/forms/labor/print';
import { laborDef } from '@/lib/forms/defs/labor';
import { laborUploadFields, laborUploadOnSet } from '@/lib/forms/defs/labor-upload';
import { sanitize, validateRules } from '@/lib/forms/engine';
import { todayRoc } from '@/lib/forms/format';
import { completeSubmission, createPublicSubmission, getSubmission, resubmitPublic, returnToPublic } from '@/lib/submissions/service';
import { laborPublicSample } from './fixtures';
import { createUser, resetDb } from './helpers';

const SIGNATURE = 'data:image/png;base64,iVBORw0KGgo=';
const NOW = new Date('2026-11-05T04:00:00Z');
const agreed = () => ({
  ...laborPublicSample(), 'labor.uploadConsent': 'Y',
  'labor.uploadFromY': '115', 'labor.uploadFromM': '1', 'labor.uploadFromD': '1',
  'labor.uploadYearsMode': 'seven', 'labor.uploadUseMode': 'permanent',
  'labor.uploadHasRepresentative': 'N', 'labor.uploadSignature': SIGNATURE,
  'labor.uploadSignedY': '115', 'labor.uploadSignedM': '1', 'labor.uploadSignedD': '1',
});
const errors = (extra: Record<string, string> = {}) => validateRules(laborDef.publicRules, sanitize(laborDef, 'public', { ...agreed(), ...extra }), NOW);

describe('勞工自費資料上傳同意', () => {
  it('同意必答、不預選；不同意可送出且清除所有同意細項', () => {
    expect(errors({ 'labor.uploadConsent': '' })).toHaveProperty('labor.uploadConsent');
    const values = sanitize(laborDef, 'public', { ...agreed(), 'labor.uploadConsent': 'N', 'labor.uploadCloud': '1', 'labor.uploadRepresentativeSignature': SIGNATURE });
    expect(validateRules(laborDef.publicRules, values, NOW)).toEqual({});
    for (const key of Object.keys(laborUploadFields).filter(key => key !== 'labor.uploadConsent')) expect(values[key]).toBe('');
  });
  it.each(['labor.uploadYearsMode', 'labor.uploadUseMode', 'labor.uploadHasRepresentative', 'labor.uploadSignature'])('同意時 %s 不可空白', key => {
    expect(errors({ [key]: '' })).toHaveProperty(key);
  });
  it('兩種期間保留原稿選項，自訂年數須為正整數且只保留適用值', () => {
    expect(errors()).toEqual({});
    for (const [mode, years] of [['labor.uploadYearsMode', 'labor.uploadYears'], ['labor.uploadUseMode', 'labor.uploadUseYears']]) {
      for (const invalid of ['', '0', '-1', '1.5', 'abc']) expect(errors({ [mode]: 'custom', [years]: invalid })).toHaveProperty(years);
      expect(errors({ [mode]: 'custom', [years]: '999' })).toEqual({});
      expect(sanitize(laborDef, 'public', { ...agreed(), [years]: '5' })[years]).toBe('');
    }
  });
  it('兩組日期皆需完整、有效；簽署日期不可晚於今天', () => {
    expect(errors({ 'labor.uploadFromD': '' })).toHaveProperty('labor.uploadFrom');
    expect(errors({ 'labor.uploadFromM': '43' })).toHaveProperty('labor.uploadFrom');
    expect(errors({ 'labor.uploadFromM': '2', 'labor.uploadFromD': '29' })).toHaveProperty('labor.uploadFrom');
    expect(errors({ 'labor.uploadFromY': '113', 'labor.uploadFromM': '2', 'labor.uploadFromD': '29' })).toEqual({});
    expect(errors({ 'labor.uploadSignedY': '116' })).toHaveProperty('labor.uploadSigned');
  });
  it('法定代理人有無控制姓名、證件號與獨立簽名；證件號大寫且保留護照', () => {
    const base = { 'labor.uploadHasRepresentative': 'Y' };
    expect(errors(base)).toMatchObject({ 'labor.uploadRepresentativeName': expect.any(String), 'labor.uploadRepresentativeIdNo': expect.any(String), 'labor.uploadRepresentativeSignature': expect.any(String) });
    expect(errors({ ...base, 'labor.uploadRepresentativeName': '代理人', 'labor.uploadRepresentativeIdNo': 'p12345678', 'labor.uploadRepresentativeSignature': SIGNATURE })).toEqual({});
    expect(sanitize(laborDef, 'public', { ...agreed(), ...base, 'labor.uploadRepresentativeIdNo': ' p1234 5678 ' })['labor.uploadRepresentativeIdNo']).toBe('P12345678');
  });
  it('選同意時帶入台灣當天；修改同意範圍、身分或日期後清除簽名', () => {
    let values: Record<string, string | string[]> = { ...agreed() };
    const set = (key: string, value: string | string[]) => { values[key] = value; };
    laborUploadOnSet('labor.uploadConsent', 'Y', set);
    const today = todayRoc();
    expect(values).toMatchObject({ 'labor.uploadSignedY': today.y, 'labor.uploadSignedM': today.m, 'labor.uploadSignedD': today.d, 'labor.uploadSignature': '' });
    for (const key of ['profile.name', 'labor.uploadFromY', 'labor.uploadCloud', 'labor.uploadSignedM', 'labor.uploadRepresentativeName']) {
      values['labor.uploadSignature'] = SIGNATURE; values['labor.uploadRepresentativeSignature'] = SIGNATURE;
      laborUploadOnSet(key, 'new', set);
      expect(values).toMatchObject({ 'labor.uploadSignature': '', 'labor.uploadRepresentativeSignature': '' });
    }
    values = { ...agreed(), 'labor.uploadRepresentativeName': '代理人' };
    laborUploadOnSet('labor.uploadConsent', 'N', set);
    expect(values['labor.uploadRepresentativeName']).toBe('');
    expect(values['labor.company']).toBe('測試事業單位');
  });
  it('原樣同意書僅同意時列印；兩處院名、基本資料、簽名與代理人條件正確', () => {
    const print = (values: Record<string, string | string[]>) => renderToStaticMarkup(<LaborPrint data={values} />);
    const html = print({ ...agreed(), 'labor.uploadHasRepresentative': 'Y', 'labor.uploadRepresentativeName': '代理人', 'labor.uploadRepresentativeSignature': SIGNATURE, 'labor.uploadCloud': '1' });
    expect(html.match(/class="ps-page"/g)).toHaveLength(2);
    expect(html.match(/烏日澄清醫院/g)).toHaveLength(2);
    expect(html).toContain('/forms/labor-upload-template.svg');
    expect(html).toContain('立同意書人簽名');
    expect(html).toContain('法定代理人簽名');
    expect(html).not.toContain('labor@example.com');
    expect(print(laborPublicSample()).match(/class="ps-page"/g)).toHaveLength(1);
    const old = { ...laborPublicSample() }; delete old['labor.uploadConsent'];
    expect(print(old).match(/class="ps-page"/g)).toHaveLength(1);
  });
  it('舊資料顯示尚未填寫，前方保留查詢用途說明，並可閱讀取消同意權利', () => {
    function Preview() {
      const old = { ...laborPublicSample() }; delete old['labor.uploadConsent'];
      const form = useFormState(laborDef, old, { rules: laborDef.publicRules, readOnly: true });
      return <FormContext.Provider value={form.ctx}><LaborPublic prefilled={false} /></FormContext.Provider>;
    }
    const html = renderToStaticMarkup(<Preview />);
    expect(html).toContain('資料上傳同意書：尚未填寫');
    expect(html).toContain('載入健康存摺，方便您查閱');
    expect(html).not.toContain('同意並由本院上傳資料後');
    expect(html).toContain('保留隨時取消本同意書之權利');
    expect(html).not.toContain('name="labor.uploadSignature"');
  });
});

describe('勞工同意書資料流程', () => {
  beforeEach(async () => {
    await resetDb();
    await db.update(formSettings).set({ isOpen: true }).where(eq(formSettings.formId, 'labor'));
  });
  it('儲存簽名及選項；同筆改不同意後清除同意細項、不重複案件', async () => {
    const first = await createPublicSubmission('labor', agreed(), 'upload-device');
    if (!first.ok) throw new Error('submit failed');
    const saved = (await getSubmission(first.id))!;
    expect(saved.publicData['labor.uploadSignature']).toBe(SIGNATURE);
    expect(await returnToPublic(first.id, 'upload-device')).toMatchObject({ ok: true });
    expect(await resubmitPublic(first.id, 'upload-device', { ...agreed(), 'labor.uploadConsent': 'N' }, new Date(), saved.publicSubmittedAt.toISOString())).toMatchObject({ ok: true });
    expect((await getSubmission(first.id))?.publicData).toMatchObject({ 'labor.uploadConsent': 'N', 'labor.uploadSignature': '', 'labor.uploadFromY': '' });
    expect(await db.select({ id: submissions.id }).from(submissions)).toHaveLength(1);
  });
  it('歷史未填同意書仍可院所確認；再次由民眾送出時需完成同意選擇', async () => {
    const first = await createPublicSubmission('labor', laborPublicSample(), 'old-upload-device');
    if (!first.ok) throw new Error('submit failed');
    const old = { ...laborPublicSample() }; delete old['labor.uploadConsent'];
    await db.update(submissions).set({ publicData: old }).where(eq(submissions.id, first.id));
    const saved = (await getSubmission(first.id))!;
    const staff = await createUser();
    expect(await completeSubmission(staff.id, first.id, saved.version, {})).toMatchObject({ ok: true });
    expect(await createPublicSubmission('labor', old, 'new-upload-device')).toMatchObject({ ok: false, reason: 'invalid', errors: { 'labor.uploadConsent': expect.any(String) } });
  });
});
