import type { PrintData } from '@/components/forms/print-kit';
import { HOSPITAL_NAME } from '@/lib/forms/hospital';
import { LABOR_UPLOAD_PRINT_CHECKS, LABOR_UPLOAD_PRINT_TEXT } from './upload-print-layout';

/** 同意者才附第二頁；缺少新欄位的歷史問卷不推定同意。 */
export function LaborUploadPrint({ data }: { data: PrintData }) {
  if (data['labor.uploadConsent'] !== 'Y') return null;
  const hasRepresentative = data['labor.uploadHasRepresentative'] === 'Y';
  const text = (key: string) => key === 'hospital.name' ? HOSPITAL_NAME
    : key.startsWith('labor.uploadRepresentative') && !hasRepresentative ? ''
    : key === 'labor.uploadYears' && data['labor.uploadYearsMode'] !== 'custom' ? ''
    : key === 'labor.uploadUseYears' && data['labor.uploadUseMode'] !== 'custom' ? ''
    : typeof data[key] === 'string' ? data[key] as string : '';
  const signature = (key: string, x: number, y: number, width: number, height: number) => {
    const value = text(key);
    return value.startsWith('data:image/png;base64,') ? <img className="labor-upload-signature" src={value} alt={key === 'labor.uploadSignature' ? '立同意書人簽名' : '法定代理人簽名'} style={{ left: `${x / 595.32 * 100}%`, top: `${y / 841.92 * 100}%`, width: `${width / 595.32 * 100}%`, height: `${height / 841.92 * 100}%` }} /> : null;
  };
  return <section className="ps-page" aria-label="個人自費檢驗（查）、藥品、醫材資料蒐集處理及利用同意書">
    <img className="labor-print-template" src="/forms/labor-upload-template.svg" alt="個人自費資料蒐集處理及利用同意書原樣表格" />
    <svg className="labor-print-values" viewBox="0 0 595.32 841.92" xmlns="http://www.w3.org/2000/svg" aria-label="同意內容與簽名">
      {LABOR_UPLOAD_PRINT_TEXT.map(({ key, x, y, width }) => {
        const value = text(key);
        if (!value) return null;
        const estimated = Array.from(value).reduce((n, c) => n + (/^[0-9A-Za-z .\-/]$/.test(c) ? 6 : 12), 0);
        return <text key={`${key}-${y}`} x={x + width / 2} y={y - 1.5} fontSize="12" textAnchor="middle" textLength={estimated > width - 2 ? width - 2 : undefined} lengthAdjust="spacingAndGlyphs">{value}</text>;
      })}
      {LABOR_UPLOAD_PRINT_CHECKS.map(({ key, value, x, y }) => data[key] === value ? <path key={key + value}
        d={`M${x + 2.4},${y - 6}l3.3,3.5l6.1,-8.3`} fill="none" stroke="#000" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /> : null)}
    </svg>
    {signature('labor.uploadSignature', 411, 578.5, 90, 24)}
    {hasRepresentative && signature('labor.uploadRepresentativeSignature', 391, 663, 110, 24)}
  </section>;
}
