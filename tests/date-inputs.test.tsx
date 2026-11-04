import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FormContext } from '@/components/forms/context';
import { DurationInputs, RocDateInputs, RocYearInput } from '@/components/forms/fields';
import { useFormState } from '@/components/forms/use-form-state';
import { FORM_IDS } from '@/lib/forms/catalog';
import { getFormDef } from '@/lib/forms/defs';
import { papDef } from '@/lib/forms/defs/pap';
import { hpDef } from '@/lib/forms/defs/hp';
import { validateRules } from '@/lib/forms/engine';

describe('日期欄位的一致性', () => {
  it.each(FORM_IDS)('%s 的共用日期、年月及年資使用相同單位組與位數', (id) => {
    function Preview() {
      const def = getFormDef(id)!;
      const form = useFormState(def, {}, { rules: def.publicRules });
      return <FormContext.Provider value={form.ctx}>
        <RocDateInputs prefix="profile.birth" label="出生日期" />
        <RocDateInputs prefix="work" label="作業起始" precision="month" leadingLabel="起始：" />
        <DurationInputs yearsName="years" monthsName="months" label="年資" />
        <RocYearInput name="year" label="發生年份" />
      </FormContext.Provider>;
    }
    const html = renderToStaticMarkup(<Preview />);
    expect(html.match(/class="date-part date-part--year"/g)).toHaveLength(4);
    expect(html.match(/maxLength="3"/g)).toHaveLength(4);
    expect(html.match(/maxLength="2"/g)).toHaveLength(4);
    expect(html).toContain('作業起始（月）');
    expect(html).not.toContain('作業起始（日）');
  });

  it('僅月日的確診日期拒絕不存在的日期，無年份時允許二月 29 日', () => {
    expect(validateRules(papDef.staffRules, { 'pap.cpM': '43', 'pap.cpD': '1' })).toHaveProperty('pap.cpDate');
    expect(validateRules(papDef.staffRules, { 'pap.cpM': '4', 'pap.cpD': '31' })).toHaveProperty('pap.cpDate');
    expect(validateRules(papDef.staffRules, { 'pap.cpM': '2' })).toHaveProperty('pap.cpDate');
    expect(validateRules(papDef.staffRules, { 'pap.cpM': '2', 'pap.cpD': '29' })).toEqual({});
    expect(validateRules(papDef.staffRules, {})).toEqual({});
  });

  it('選填民國年份可留空，但已填的 0 不會被當作有效年份', () => {
    const papRules = papDef.publicRules.filter(r => r.id === 'pap.q15Year');
    expect(validateRules(papRules, { 'pap.q15': '1', 'pap.q15Year': '0' })).toHaveProperty('pap.q15Year');
    expect(validateRules(papRules, { 'pap.q15': '1', 'pap.q15Year': '' })).toEqual({});
    const hpRules = hpDef.publicRules.filter(r => r.id === 'hp.endoYear');
    expect(validateRules(hpRules, { 'hp.endoscopy': 'Y', 'hp.endoYear': '0' })).toHaveProperty('hp.endoYear');
    expect(validateRules(hpRules, { 'hp.endoscopy': 'Y', 'hp.endoYear': '115' })).toEqual({});
  });
});
