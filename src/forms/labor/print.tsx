import type { PrintData } from '@/components/forms/print-kit';
import { LABOR_PRINT_CHECKS, LABOR_PRINT_TEXT } from './print-layout';

/** 原 PDF 轉為字型輪廓向量底稿，逐欄依原始座標套印。 */
export function LaborPrint({ data }: { data: PrintData }) {
  return <div className="ps ps--labor">
    <section className="ps-page" aria-label="勞工一般體格及健康檢查紀錄">
      <img className="labor-print-template" src="/forms/labor-template.svg" alt="勞工一般體格及健康檢查紀錄原樣表格" />
      <svg className="labor-print-values" viewBox="0 0 596 842" xmlns="http://www.w3.org/2000/svg" aria-label="填寫內容">
        {LABOR_PRINT_TEXT.map(({ key, x, y, width }) => {
          const value = data[key];
          if (typeof value !== 'string' || !value) return null;
          const estimated = Array.from(value).reduce((n, c) => n + (/^[0-9 .\-/]$/.test(c) ? 5.7 : 10.5), 0);
          return <text key={key} x={key === 'profile.name' ? x + 2 : x + width / 2} y={y - .6} textAnchor={key === 'profile.name' ? 'start' : 'middle'} fontSize="10.5"
            textLength={estimated > width - 2 ? width - 2 : undefined} lengthAdjust="spacingAndGlyphs">{value}</text>;
        })}
        {LABOR_PRINT_CHECKS.map(({ key, value, x, y }) => {
          const selected = Array.isArray(data[key]) ? data[key].includes(value) : data[key] === value;
          return selected ? <path key={`${key}-${value}`} d={`M${x + .8},${y - 3.8}l1.8,2.3l4,-5.5`} fill="none" stroke="#000" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /> : null;
        })}
      </svg>
    </section>
  </div>;
}
