'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from '../forms.module.css';

type Props = {
  url: string;
  /** 下載用的 QR SVG（含像素尺寸） */
  svg: string;
  fileName: string;
  posterHref: string;
};

const PNG_SIZE = 2048;

function saveBlob(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export function QrTools({ url, svg, fileName, posterHref }: Props) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copyUrl() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadSvg() {
    saveBlob(new Blob([svg], { type: 'image/svg+xml' }), `${fileName}.svg`);
  }

  // 以瀏覽器把 SVG 畫到 canvas 再轉 PNG，向量放大後仍然清晰
  function downloadPng() {
    setBusy(true);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = PNG_SIZE;
      canvas.height = PNG_SIZE;
      canvas.getContext('2d')!.drawImage(img, 0, 0, PNG_SIZE, PNG_SIZE);
      canvas.toBlob((blob) => {
        if (blob) saveBlob(blob, `${fileName}.png`);
        setBusy(false);
      }, 'image/png');
    };
    img.onerror = () => setBusy(false);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  return (
    <>
      <div className={styles.url}>
        <code title={url}>{url}</code>
        <button type="button" className="btn btn--ghost btn--sm" onClick={copyUrl}>
          {copied ? '已複製' : '複製網址'}
        </button>
      </div>
      <div className={styles.tools}>
        <button type="button" className="btn btn--primary" onClick={downloadPng} disabled={busy}>
          {busy ? '產生中…' : '下載 PNG'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={downloadSvg}>
          下載 SVG
        </button>
        <Link className="btn btn--ghost" href={posterHref}>
          列印海報
        </Link>
      </div>
    </>
  );
}
