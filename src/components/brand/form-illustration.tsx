import type { ReactNode } from 'react';
import type { FormId } from '@/lib/forms/catalog';

// 畫面用插圖與紙本、QR code 的既有圖稿分開，維持原列印與掃碼內容。
const details: Record<Exclude<FormId, 'adult' | 'labor'>, ReactNode> = {
  hpv: <>
    <circle cx="105" cy="104" r="43" />
    <path d="m136 137 37 37a9 9 0 0 0 13-13l-37-37" />
    <circle cx="105" cy="104" r="20" />
    <path d="M105 76v8m0 40v8m-28-28h8m40 0h8M85 84l6 6m28 28 6 6m-40 0 6-6m28-28 6-6" />
    <circle cx="99" cy="99" r="2" fill="currentColor" stroke="none" />
    <circle cx="112" cy="108" r="2" fill="currentColor" stroke="none" />
  </>,
  pap: <>
    <path d="M94 62h23v57H94zM100 53h11v9m-17 57h23m-12 0v13m-17 5h57M122 88c48 4 53 76 7 83H83m-10 13h100v12H73zM104 153v18" />
    <path d="M94 92h23M139 99c18 16 20 38 4 53" />
    <circle cx="141" cy="118" r="6" fill="#e1efff" />
  </>,
  oral: <>
    <path d="M54 104c20-21 40-26 66-14 26-12 46-7 66 14-17 45-39 64-66 64s-49-19-66-64Z" />
    <path d="M56 105c24 8 43 10 64 10s40-2 64-10M80 112l5 19h70l5-19M101 116v14m19-14v14m19-14v14" />
    <circle cx="169" cy="157" r="19" fill="#fcfdff" />
    <path d="m183 171 18 18" strokeWidth="6" />
  </>,
  hp: <>
    <path d="M109 58v40c0 17 18 12 21-2 4-18 32-17 42 1 20 35-4 79-41 84-45 6-74-17-68-50 3-19 18-32 22-48V58" />
    <path d="M90 131c-4 18 10 33 29 32" />
    <path d="M151 53c-11 10 11 12 0 22s11 12 0 22m19-36 8 3m-39-3-8 4m40 15 9 4m-40 0-8 4" />
  </>,
  fit: <>
    <rect x="94" y="76" width="52" height="110" rx="13" />
    <rect x="88" y="59" width="64" height="23" rx="7" fill="#d1e4fa" />
    <path d="M103 65v10m11-10v10m12-10v10m11-10v10M95 126h50M106 161h28m-28 10h19" />
    <path d="M120 98c-4 6-9 10-9 15a9 9 0 0 0 18 0c0-5-5-9-9-15Z" fill="#e6b7a3" stroke="none" />
  </>,
};

export function FormIllustration({ formId }: { formId: FormId | 'appointment' }) {
  if (formId === 'adult' || formId === 'labor' || formId === 'appointment') {
    return <img src={`/brand/care-${formId === 'appointment' ? 'calendar' : 'document'}.svg`}
      alt="" width={360} height={300} />;
  }

  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width={240} height={240}
    aria-hidden="true" fill="none" style={{ color: '#5d86b5' }}>
    <circle cx="120" cy="123" r="91" fill="#e1efff" />
    <circle cx="186" cy="52" r="17" fill="#f9e8de" />
    <circle cx="40" cy="69" r="4" fill="#a7c8ee" />
    <circle cx="209" cy="163" r="4" fill="#a7c8ee" />
    <path d="M29 118a92 92 0 0 1 37-66m99 151a92 92 0 0 0 35-31" stroke="#b4d0f1" strokeWidth="1.5" />
    <g stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      {details[formId]}
    </g>
  </svg>;
}
