'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormContext, useText } from './context';

const INK = '#16191c';
const PEN = 2.8;

type Point = { x: number; y: number };

const PEN_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 20h16M6.5 15.5l9.8-9.8a2 2 0 0 1 2.8 2.8l-9.8 9.8L5 19l1.5-3.5z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

/** 簽名欄位：點擊開啟簽名板，完成後存成透明背景 PNG（data URL） */
export function SignatureField({ name, signer, labelId }: { name: string; signer: string; labelId?: string }) {
  const { set, readOnly } = useFormContext();
  const value = useText(name);
  const [open, setOpen] = useState(false);
  const signed = value.startsWith('data:image/png;base64,');

  return (
    <div className={`sig${signed ? ' is-signed' : ''}`}>
      <button
        type="button"
        className="sig__preview"
        disabled={readOnly}
        aria-describedby={labelId}
        aria-label={signed ? '已簽名，點此重新簽名' : '點此簽名'}
        onClick={() => setOpen(true)}
      >
        {signed ? (
          <img src={value} alt={`${signer}簽名`} />
        ) : (
          <span className="sig__ph">
            {PEN_ICON}
            {readOnly ? '尚未簽名' : '點此簽名'}
          </span>
        )}
      </button>
      {signed && !readOnly && (
        <div className="sig__actions">
          <button type="button" className="btn btn--ghost" onClick={() => setOpen(true)}>
            重新簽名
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => set(name, '')}>
            清除
          </button>
        </div>
      )}
      {open && (
        <SignaturePad
          signer={signer}
          onCancel={() => setOpen(false)}
          onDone={(png) => {
            set(name, png);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

/** 以中點二次曲線連接各點，讓筆畫平滑 */
function trace(ctx: CanvasRenderingContext2D, pts: Point[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length < 3) {
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x + 0.01, last.y + 0.01);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
  }
  ctx.stroke();
}

function setPen(ctx: CanvasRenderingContext2D) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = PEN;
  ctx.strokeStyle = INK;
}

/** 只輸出有筆跡的範圍，透明背景，最多 2 倍解析度 */
function exportPng(strokes: Point[][]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of strokes) {
    for (const p of s) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  const margin = PEN * 2;
  const w = maxX - minX + margin * 2;
  const h = maxY - minY + margin * 2;
  const k = Math.min(2, 1400 / w, 600 / h);
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(w * k));
  out.height = Math.max(1, Math.round(h * k));
  const ctx = out.getContext('2d')!;
  ctx.setTransform(k, 0, 0, k, (margin - minX) * k, (margin - minY) * k);
  setPen(ctx);
  strokes.forEach((s) => trace(ctx, s));
  return out.toDataURL('image/png');
}

/** 全螢幕簽名板（手指、觸控筆、滑鼠皆可；旋轉螢幕時依比例縮放已寫的筆畫） */
function SignaturePad({
  signer,
  onCancel,
  onDone,
}: {
  signer: string;
  onCancel: () => void;
  onDone: (png: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pad = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Point[][]>([]);
  const drawing = useRef<Point[] | null>(null);
  const ref = useRef<{ w: number; h: number } | null>(null);
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const [hasInk, setHasInk] = useState(false);

  const scale = () => (ref.current ? Math.min(size.current.w / ref.current.w, size.current.h / ref.current.h) : 1);

  const repaint = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const { w, h, dpr } = size.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const k = (ref.current ? Math.min(w / ref.current.w, h / ref.current.h) : 1) * dpr;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    setPen(ctx);
    strokes.current.forEach((s) => trace(ctx, s));
    setHasInk(strokes.current.length > 0);
  }, []);

  useEffect(() => {
    const d = dialog.current!;
    d.showModal();
    const resize = () => {
      const p = pad.current!;
      const c = canvas.current!;
      size.current = { w: p.clientWidth, h: p.clientHeight, dpr: Math.max(1, window.devicePixelRatio || 1) };
      c.width = Math.round(size.current.w * size.current.dpr);
      c.height = Math.round(size.current.h * size.current.dpr);
      repaint();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(pad.current!);
    return () => observer.disconnect();
  }, [repaint]);

  const point = (e: React.PointerEvent | PointerEvent): Point => {
    const r = canvas.current!.getBoundingClientRect();
    const k = scale();
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };

  return (
    <dialog
      ref={dialog}
      className="sigdlg"
      aria-labelledby="sigdlg-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <div className="sigdlg__head">
        <div>
          <h2 className="sigdlg__title" id="sigdlg-title">
            請簽名
          </h2>
          <p className="sigdlg__who">簽名人：{signer}</p>
        </div>
        <button type="button" className="sigdlg__x" aria-label="取消簽名並關閉" onClick={onCancel}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="sigdlg__pad" ref={pad}>
        <canvas
          ref={canvas}
          className="sigdlg__canvas"
          role="img"
          aria-label="簽名板，請用手指在此簽名"
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            if (!ref.current) ref.current = { w: size.current.w, h: size.current.h };
            drawing.current = [point(e)];
            strokes.current.push(drawing.current);
            repaint();
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
            for (const ev of events.length ? events : [e.nativeEvent]) drawing.current.push(point(ev));
            repaint();
          }}
          onPointerUp={() => (drawing.current = null)}
          onPointerCancel={() => (drawing.current = null)}
        />
        <div className="sigdlg__line" aria-hidden="true">
          <span>✕</span>
        </div>
        {!hasInk && (
          <p className="sigdlg__ph" aria-hidden="true">
            請用手指在框內簽名
          </p>
        )}
      </div>
      <p className="sigdlg__tip">小提示：手機橫放，簽名空間更大</p>
      <div className="sigdlg__foot">
        <button
          type="button"
          className="btn btn--ghost"
          disabled={!hasInk}
          onClick={() => {
            strokes.current = [];
            ref.current = null;
            repaint();
          }}
        >
          清除重寫
        </button>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!hasInk}
          onClick={() => onDone(exportPng(strokes.current))}
        >
          完成簽名
        </button>
      </div>
    </dialog>
  );
}
