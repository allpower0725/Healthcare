import QRCode from 'qrcode';
import { appUrl } from '@/lib/env';
import { artSvg } from './art';
import { FORMS, type FormId } from './catalog';

/** 民眾端填寫網址，也就是 QR code 的內容 */
export function formUrl(formId: FormId) {
  return `${appUrl()}/f/${formId}`;
}

const QUIET_ZONE = 4;
/** 定位點外框色：與插圖描邊同色 */
const RING_COLOR = '#1f3d3a';

/** 對齊圖形的中心座標（QR 規格 ISO/IEC 18004 附錄 E，與 qrcode 套件的算法相同） */
function alignmentCenters(version: number, size: number) {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = size === 145 ? 26 : Math.ceil((size - 13) / (2 * count - 2)) * 2;
  const coords = [6];
  for (let i = count - 1; i > 0; i--) coords[i] = size - 7 - (count - 1 - i) * step;

  const centers: [number, number][] = [];
  for (const r of coords) {
    for (const c of coords) {
      const onFinder = (r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6);
      if (!onFinder) centers.push([r, c]);
    }
  }
  return centers;
}

/**
 * 產生有設計感的表單 QR code（SVG 字串，座標單位為模組）：
 * 圓點資料點用表單主色、圓角定位點、中央圓形留白放主題插圖。
 * 容錯等級 H 可承受約 30% 的資料損失，中央留白只占約 7% 的面積。
 * 對齊圖形必須畫成完整的「眼睛」，只用圓點拼的話掃描器常認不出來（見 tests/form-qr.test.ts）。
 */
export function renderFormQrSvg(formId: FormId, url: string, options: { size?: number } = {}) {
  const form = FORMS[formId];
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const n = qr.modules.size;
  const total = n + QUIET_ZONE * 2;
  const isDark = (row: number, col: number) => qr.modules.get(row, col) === 1;

  // 版本 7 以上中央有對齊圖形，留白縮小避免蓋住
  const holeRadius = (n * (qr.version >= 7 ? 0.22 : 0.3)) / 2;
  const center = n / 2;
  const inFinder = (r: number, c: number) => (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);
  const inHole = (r: number, c: number) => Math.hypot(r + 0.5 - center, c + 0.5 - center) < holeRadius + 0.5;
  // 被中央留白蓋到的對齊圖形（版本 7 以上的正中央那個）不畫，交給容錯處理
  const aligns = alignmentCenters(qr.version, n).filter(([r, c]) => !inHole(r, c));
  const inAlign = (r: number, c: number) => aligns.some(([ar, ac]) => Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2);

  const parts: string[] = [];
  const size = options.size ? ` width="${options.size}" height="${options.size}"` : '';
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}"${size} role="img" aria-label="${form.name} 填寫 QR code">`,
    `<rect width="${total}" height="${total}" fill="#fff"/>`,
  );

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!isDark(r, c) || inFinder(r, c) || inHole(r, c) || inAlign(r, c)) continue;
      parts.push(`<circle cx="${c + QUIET_ZONE + 0.5}" cy="${r + QUIET_ZONE + 0.5}" r="0.42" fill="${form.color}"/>`);
    }
  }

  for (const [r, c] of aligns) {
    const x = c - 2 + QUIET_ZONE;
    const y = r - 2 + QUIET_ZONE;
    parts.push(
      `<g data-align="">`,
      `<rect x="${x + 0.5}" y="${y + 0.5}" width="4" height="4" rx="1.2" fill="none" stroke="${RING_COLOR}" stroke-width="1"/>`,
      `<rect x="${x + 2}" y="${y + 2}" width="1" height="1" rx="0.3" fill="${form.color}"/>`,
      `</g>`,
    );
  }

  for (const [r, c] of [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ]) {
    const x = c + QUIET_ZONE;
    const y = r + QUIET_ZONE;
    parts.push(
      `<g data-finder="">`,
      `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.8" fill="none" stroke="${RING_COLOR}" stroke-width="1"/>`,
      `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.9" fill="${form.color}"/>`,
      `</g>`,
    );
  }

  const cx = center + QUIET_ZONE;
  const artSize = holeRadius * 2 * 0.74;
  parts.push(
    `<circle cx="${cx}" cy="${cx}" r="${holeRadius}" fill="#fff" stroke="${form.tint}" stroke-width="0.35"/>`,
    artSvg(formId, `x="${cx - artSize / 2}" y="${cx - artSize / 2}" width="${artSize}" height="${artSize}"`),
    `</svg>`,
  );
  return parts.join('');
}
