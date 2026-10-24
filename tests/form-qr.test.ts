import { Resvg } from '@resvg/resvg-js';
import { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from '@zxing/library';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { describe, expect, it } from 'vitest';
import { FORM_IDS, FORMS } from '@/lib/forms/catalog';
import { renderFormQrSvg } from '@/lib/forms/qr';

function rasterize(svg: string, width: number) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: width }, background: '#fff' }).render();
}

/** ZXing：Android 與多數掃描 App 的解碼核心 */
function scanWithZxing(svg: string, width: number) {
  const image = rasterize(svg, width);
  const rgba = image.pixels;
  const luminance = new Uint8ClampedArray(image.width * image.height);
  for (let i = 0; i < luminance.length; i++) {
    luminance[i] = (rgba[i * 4] * 299 + rgba[i * 4 + 1] * 587 + rgba[i * 4 + 2] * 114) / 1000;
  }
  const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(luminance, image.width, image.height)));
  try {
    return new QRCodeReader().decode(bitmap).getText();
  } catch {
    return null;
  }
}

/** jsQR：較嚴格的第二套解碼器（大圖時本身就不穩，只測一般相機畫面的尺寸） */
function scanWithJsQR(svg: string, width: number) {
  const image = rasterize(svg, width);
  return jsQR(new Uint8ClampedArray(image.pixels), image.width, image.height)?.data ?? null;
}

/** 下載的 PNG 是 2048px */
const ZXING_WIDTHS = [200, 300, 500, 800, 1200, 2048];
const JSQR_WIDTHS = [200, 300, 500, 800];

function expectScannable(svg: string, url: string) {
  for (const width of ZXING_WIDTHS) expect(scanWithZxing(svg, width), `ZXing ${width}px`).toBe(url);
  for (const width of JSQR_WIDTHS) expect(scanWithJsQR(svg, width), `jsQR ${width}px`).toBe(url);
}

const URL = 'https://example.vercel.app/f/hpv';

describe('表單 QR code', () => {
  const svg = renderFormQrSvg('hpv', URL);
  const n = QRCode.create(URL, { errorCorrectionLevel: 'H' }).modules.size;

  it('含四格安靜區的正方形畫布', () => {
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${n + 8} ${n + 8}"`);
  });

  it('三個定位點、表單主色、中央插圖', () => {
    expect(svg.match(/data-finder/g)).toHaveLength(3);
    expect(svg).toContain(`fill="${FORMS.hpv.color}"`);
    expect(svg).toContain('id="hpv-glass"');
  });

  it('資料點只畫在定位點與中央留白以外', () => {
    const dots = svg.match(/<circle cx="[\d.]+" cy="[\d.]+" r="0\.42"/g) ?? [];
    const coords = dots.map((d) => d.match(/cx="([\d.]+)" cy="([\d.]+)"/)!.slice(1).map(Number));
    const center = (n + 8) / 2;
    for (const [x, y] of coords) {
      const inFinder = (x < 12 && y < 12) || (x < 12 && y > n - 4) || (x > n - 4 && y < 12);
      expect(inFinder).toBe(false);
      expect(Math.hypot(x - center, y - center)).toBeGreaterThan(n * 0.14);
    }
    expect(coords.length).toBeGreaterThan(n * 4);
  });

  it('可指定輸出尺寸', () => {
    expect(renderFormQrSvg('fit', URL, { size: 1024 })).toContain('width="1024" height="1024"');
  });

  it.each(FORM_IDS)('%s 的 QR code 在各種尺寸都能掃出正確網址', (formId) => {
    const url = `https://example.vercel.app/f/${formId}`;
    expectScannable(renderFormQrSvg(formId, url), url);
  });

  it.each(FORM_IDS)('%s 網址較長（版本 7 以上，中央有對齊圖形）時仍可掃描', (formId) => {
    const url = `https://preventive-care-forms.wujih-chengching-hospital.org.tw/f/${formId}`;
    expect(QRCode.create(url, { errorCorrectionLevel: 'H' }).version).toBeGreaterThanOrEqual(7);
    expectScannable(renderFormQrSvg(formId, url), url);
  });
});
