'use client';

import { Fragment, type ReactNode, useEffect, useState } from 'react';

const FONT_KEY = 'pp:font-size';
const SIZES = [
  ['m', '標準字級'],
  ['l', '大字級'],
  ['xl', '特大字級'],
] as const;
type Size = (typeof SIZES)[number][0];

/** 字級切換：設定存在本機（非個資），所有表單共用 */
function FontSize() {
  const [size, setSize] = useState<Size>('m');

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(FONT_KEY);
    } catch {
      // 無法使用 localStorage 時維持標準字級
    }
    if (saved === 'l' || saved === 'xl') setSize(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', size);
    return () => document.documentElement.removeAttribute('data-font-size');
  }, [size]);

  return (
    <div className="fontsize" role="group" aria-label="字級大小">
      <span className="fontsize__label" aria-hidden="true">
        字級
      </span>
      <div className="fontsize__btns">
        {SIZES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={size === value}
            aria-label={label}
            onClick={() => {
              setSize(value);
              try {
                localStorage.setItem(FONT_KEY, value);
              } catch {
                // 略過
              }
            }}
          >
            A
          </button>
        ))}
      </div>
    </div>
  );
}

/** 未開放填寫的說明；有設定開放期間時一併顯示 */
export function ClosedCard({ message, period }: { message: string; period: string | null }) {
  return (
    <section className="card closed">
      <h2>目前未開放填寫</h2>
      {period && (
        <p className="closed__period">
          <span>開放期間</span>
          {/* 每個日期時間不拆行，換行只發生在「–」 */}
          <b>
            {period.split(' – ').map((part, i) => (
              <Fragment key={i}>
                {i > 0 && ' – '}
                <span>{part}</span>
              </Fragment>
            ))}
          </b>
        </p>
      )}
      <p>{message}如需協助，請洽櫃台醫護人員。</p>
    </section>
  );
}

/** 民眾端頁面外框：頂部列（院徽、字級、填寫進度）、內容、頁尾 */
export function PublicChrome({
  progress,
  foot,
  children,
}: {
  progress?: number;
  foot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="ppf ppf-page">
      <header className="appbar">
        <div className="appbar__inner">
          <span className="brand">
            <img src="/brand/logo.svg" alt="烏日澄清醫院" width={160} height={30} />
          </span>
          <FontSize />
        </div>
        <div className="progress" aria-hidden="true">
          <div className="progress__bar" style={{ width: `${progress ?? 0}%` }} />
        </div>
      </header>
      <main className="page">{children}</main>
      <footer className="foot">
        <p>烏日澄清醫院｜預防保健服務</p>
        {foot}
      </footer>
    </div>
  );
}
