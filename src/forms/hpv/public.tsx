'use client';

import { useText } from '@/components/forms/context';
import { Choices, Field, Flag, RegionInputs, ShowIf } from '@/components/forms/fields';
import { ProfileSection, StepCard } from '@/components/forms/sections';
import { SignatureField } from '@/components/forms/signature';
import { HPV_QUESTIONS } from '@/lib/forms/defs/hpv';

function CurrentRegion() {
  const county = useText('profile.addrCounty');
  const town = useText('profile.addrTown');
  return county ? <span className="check__sub">（{county + town}）</span> : null;
}

/** HPV 民眾填寫區：基本資料 → 戶籍地址 → 健康狀況 → 同意與簽名 */
export function HpvPublic({ prefilled }: { prefilled: boolean }) {
  return (
    <>
      <ProfileSection step={1} prefilled={prefilled} />

      <StepCard no={2} title="戶籍地址" desc="只需要縣市與鄉鎮市區；其他表單有相同欄位時，也會自動帶入。">
        <div className="field">
          <Flag name="profile.regSame">
            與現住址相同 <CurrentRegion />
          </Flag>
        </div>
        <ShowIf when="profile.regSame!=1">
          <Field rule="profile.reg" role="group">
            <RegionInputs countyKey="profile.regCounty" townKey="profile.regTown" />
          </Field>
        </ShowIf>
      </StepCard>

      <StepCard no={3} title="健康狀況" desc="請依最近一年的情況回答。不清楚或不想回答，可選「不知道/拒答」。">
        {HPV_QUESTIONS.map((q) => (
          <Field key={q.key} rule={q.key} className="q" role="radiogroup" label={q.title} validateOnBlur={false}>
            <Choices name={q.key} options={q.options} />
          </Field>
        ))}
      </StepCard>

      <StepCard no={4} title="同意與簽名" desc="請確認以上資料無誤後簽名。">
        <p className="statement">
          本表資料將會作為衛生及學術單位進行個案追蹤關懷及健康管理、資格檢核、比對連結、統計分析、政策評估及其他相關目的使用。
        </p>
        <Field rule="hpv.sigConsent" label="本人同意接受檢查，確認以上資料正確無誤。" validateOnBlur={false}>
          <SignatureField name="hpv.sigConsent" signer="受檢者本人" />
        </Field>
      </StepCard>
    </>
  );
}

/** 民眾選了某些答案時自動帶入其他題（例：從未做過 HPV 檢測，結果題自動選「從未檢查過」） */
export function hpvOnSet(key: string, value: string | string[], set: (key: string, value: string) => void) {
  if (key === 'hpv.q16' && value === '5') set('hpv.q17', '4');
}
