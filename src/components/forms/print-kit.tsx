// 原樣紙本的資料綁定元件（伺服器端渲染）：填寫底線、圈選選項、勾選方框、方格、簽名
import type { CSSProperties, ReactNode } from 'react';

export type PrintData = Record<string, string | string[] | undefined>;

export function printKit(data: PrintData) {
  const text = (key: string) => {
    const v = data[key];
    return v == null ? '' : Array.isArray(v) ? v.join('、') : v;
  };
  const isOn = (key: string, value: string) => {
    const current = data[key];
    return Array.isArray(current) ? current.includes(value) : (current ?? '') === value;
  };

  return {
    /** 選項：被選取時以外框圈起 */
    Opt({ k, v, children }: { k: string; v: string; children: ReactNode }) {
      return <span className={`ps-opt${isOn(k, v) ? ' on' : ''}`}>{children}</span>;
    },
    /** 勾選方框 */
    Cb({ k, v }: { k: string; v: string }) {
      return <span className={`ps-cb${isOn(k, v) ? ' on' : ''}`} />;
    },
    /** 填寫底線 */
    Fill({ k, w, style }: { k: string; w?: string; style?: CSSProperties }) {
      return (
        <span className="ps-fill" style={{ minWidth: w, ...style }}>
          {text(k)}
        </span>
      );
    },
    /** 方格：每格一個字，至少 n 格 */
    Cells({ k, n, line }: { k?: string; n: number; line?: boolean }) {
      const chars = Array.from(k ? text(k) : '');
      const count = Math.max(n, chars.length);
      return (
        <span className={`ps-cells${line ? ' ps-cells--line' : ''}`}>
          {Array.from({ length: count }, (_, i) => (
            <i key={i}>{chars[i] ?? ''}</i>
          ))}
        </span>
      );
    },
    /** 簽名圖 */
    Sign({ k, full, style }: { k: string; full?: boolean; style?: CSSProperties }) {
      const v = text(k);
      return (
        <span className={`ps-sign${full ? ' ps-sign--full' : ''}`} style={style}>
          {v.startsWith('data:image/png;base64,') && <img src={v} alt="" />}
        </span>
      );
    },
  };
}
