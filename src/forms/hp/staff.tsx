'use client';

import { Choices, Field, TextInput } from '@/components/forms/fields';
import { DateField, StaffCard } from '@/components/forms/sections';
import { HP_OPTIONS as O } from '@/lib/forms/defs/hp';

/** 胃幽門螺旋桿菌院所填寫區（採檢單位填寫）：支付方式、採檢單位、門診日期 */
export function HpStaff() {
  return (
    <StaffCard title="收案資訊">
      <Field role="radiogroup" label="支付方式">
        <Choices name="hp.pay" options={O.pay} />
      </Field>
      <div className="grid2">
        <Field label="採檢單位" htmlFor="s-unit">
          <TextInput name="hp.unit" id="s-unit" maxLength={30} />
        </Field>
        <Field label="醫事機構代碼" htmlFor="s-unitcode">
          <TextInput name="hp.unitCode" id="s-unitcode" maxLength={10} digits />
        </Field>
      </div>
      <DateField prefix="hp.visit" label="門診日期" />
      <DateField prefix="hp.visit2" label="第二次門診日期" hint="糞便抗原檢測首次檢驗結果為「檢測失效」時才需填寫。" />
    </StaffCard>
  );
}
