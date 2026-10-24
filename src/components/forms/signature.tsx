'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormContext, useText } from './context';

const INK = '#16191c';
const PEN = 2.8;
/** 圖上標示：紅色筆跡，輸出與底圖同比例的透明疊圖 */
const MARK_INK = '#d0021b';
const MARK_PEN = 3.2;
const MARK_WIDTH = 732;

type Point = { x: number; y: number };
/** 圖上標示：底圖網址、寬高比、說明、先前的標示 */
type Annotate = { bg: string; aspect: number; hint: string; base: string };

const isPng = (v: string) => v.startsWith('data:image/png;base64,');

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
  const signed = isPng(value);

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

/** 部位圖標示：在底圖上畫圈、寫代碼；只儲存筆跡疊圖（與底圖同比例），再次開啟可繼續加註 */
export function MapField(props: {
  name: string;
  bg: string;
  /** 底圖寬高比 */
  aspect: number;
  hint: string;
  labelId?: string;
}) {
  const { set, readOnly } = useFormContext();
  const value = useText(props.name);
  const [open, setOpen] = useState(false);
  const marked = isPng(value);

  return (
    <div className={`sig sig--map${marked ? ' is-signed' : ''}`}>
      <button
        type="button"
        className="sig__preview"
        disabled={readOnly}
        aria-describedby={props.labelId}
        aria-label={marked ? '已標示，點此繼續標示' : '點此在圖上標示'}
        onClick={() => setOpen(true)}
      >
        <span className="mapview" style={{ aspectRatio: props.aspect }}>
          <img src={props.bg} alt="" />
          {marked && <img src={value} alt="異常部位標示" />}
        </span>
        {!marked && (
          <span className="sig__ph">
            {PEN_ICON}
            {readOnly ? '尚未標示' : '點此在圖上標示'}
          </span>
        )}
      </button>
      {marked && !readOnly && (
        <div className="sig__actions">
          <button type="button" className="btn btn--ghost" onClick={() => setOpen(true)}>
            繼續標示
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => set(props.name, '')}>
            清除標示
          </button>
        </div>
      )}
      {open && (
        <SignaturePad
          signer=""
          annotate={{ bg: props.bg, aspect: props.aspect, hint: props.hint, base: value }}
          onCancel={() => setOpen(false)}
          onDone={(png) => {
            set(props.name, png);
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

function setPen(ctx: CanvasRenderingContext2D, mark = false) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = mark ? MARK_PEN : PEN;
  ctx.strokeStyle = mark ? MARK_INK : INK;
}

const ready = (img: HTMLImageElement | null): img is HTMLImageElement =>
  !!img && img.complete && img.naturalWidth > 0;

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

/** 標示：與底圖同比例、不裁切，疊上先前的標示 */
function exportMarks(strokes: Point[][], refWidth: number, aspect: number, base: HTMLImageElement | null) {
  const out = document.createElement('canvas');
  out.width = MARK_WIDTH;
  out.height = Math.round(MARK_WIDTH / aspect);
  const ctx = out.getContext('2d')!;
  if (ready(base)) ctx.drawImage(base, 0, 0, out.width, out.height);
  const k = out.width / refWidth;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  setPen(ctx, true);
  strokes.forEach((s) => trace(ctx, s));
  return out.toDataURL('image/png');
}

/**
 * 全螢幕簽名板（手指、觸控筆、滑鼠皆可；旋轉螢幕時依比例縮放已寫的筆畫）。
 * annotate 時改為圖上標示：畫布貼齊底圖比例，可復原、清除全部（含先前的標示）。
 */
function SignaturePad({
  signer,
  annotate,
  onCancel,
  onDone,
}: {
  signer: string;
  annotate?: Annotate;
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
  const bg = useRef<HTMLImageElement | null>(null);
  const base = useRef<HTMLImageElement | null>(null);
  /** 本次按過「清除全部」：先前的標示不再顯示（可用「復原」找回） */
  const cleared = useRef(false);
  const [ink, setInk] = useState({ strokes: 0, cleared: false });
  // 開啟期間底圖與先前的標示不變，只在開啟時讀一次
  const [mode] = useState(annotate);
  const mark = !!mode;
  const hadBase = !!mode && isPng(mode.base);

  const scale = () => (ref.current ? Math.min(size.current.w / ref.current.w, size.current.h / ref.current.h) : 1);

  const repaint = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const { w, h, dpr } = size.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (ready(bg.current)) ctx.drawImage(bg.current, 0, 0, w, h);
    if (!cleared.current && ready(base.current)) ctx.drawImage(base.current, 0, 0, w, h);
    const k = (ref.current ? Math.min(w / ref.current.w, h / ref.current.h) : 1) * dpr;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    setPen(ctx, mark);
    strokes.current.forEach((s) => trace(ctx, s));
    setInk({ strokes: strokes.current.length, cleared: cleared.current });
  }, [mark]);

  useEffect(() => {
    const d = dialog.current!;
    d.showModal();
    if (mode) {
      const load = (src: string) => {
        const img = new Image();
        img.onload = repaint;
        img.src = src;
        return img;
      };
      bg.current = load(mode.bg);
      base.current = isPng(mode.base) ? load(mode.base) : null;
    }
    // 簽名：畫布填滿簽名區；標示：畫布依底圖比例置中
    const resize = () => {
      const p = pad.current!;
      const c = canvas.current!;
      let w = p.clientWidth;
      let h = p.clientHeight;
      if (mode) {
        if (w / h > mode.aspect) w = h * mode.aspect;
        else h = w / mode.aspect;
        Object.assign(c.style, {
          left: `${(p.clientWidth - w) / 2}px`,
          top: `${(p.clientHeight - h) / 2}px`,
          width: `${w}px`,
          height: `${h}px`,
        });
      }
      size.current = { w, h, dpr: Math.max(1, window.devicePixelRatio || 1) };
      c.width = Math.round(w * size.current.dpr);
      c.height = Math.round(h * size.current.dpr);
      repaint();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(pad.current!);
    return () => observer.disconnect();
  }, [repaint, mode]);

  const point = (e: React.PointerEvent | PointerEvent): Point => {
    const r = canvas.current!.getBoundingClientRect();
    const k = scale();
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };

  const changed = ink.strokes > 0 || ink.cleared;
  const done = () => {
    if (!mode) return onDone(exportPng(strokes.current));
    // 清除全部後沒有再畫：視同沒有標示
    if (!strokes.current.length) return onDone('');
    onDone(exportMarks(strokes.current, ref.current!.w, mode.aspect, cleared.current ? null : base.current));
  };

  return (
    <dialog
      ref={dialog}
      className={`sigdlg${mode ? ' is-annotate' : ''}`}
      aria-labelledby="sigdlg-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <div className="sigdlg__head">
        <div>
          <h2 className="sigdlg__title" id="sigdlg-title">
            {mode ? '標示異常部位' : '請簽名'}
          </h2>
          <p className="sigdlg__who">{mode ? mode.hint : `簽名人：${signer}`}</p>
        </div>
        <button
          type="button"
          className="sigdlg__x"
          aria-label={mode ? '取消，不儲存這次的標示' : '取消簽名並關閉'}
          onClick={onCancel}
        >
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
          aria-label={mode ? '部位圖標示區，請用手指在異常部位畫記' : '簽名板，請用手指在此簽名'}
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
        {!mode && (
          <div className="sigdlg__line" aria-hidden="true">
            <span>✕</span>
          </div>
        )}
        {!mode && !ink.strokes && (
          <p className="sigdlg__ph" aria-hidden="true">
            請用手指在框內簽名
          </p>
        )}
      </div>
      {!mode && <p className="sigdlg__tip">小提示：手機橫放，簽名空間更大</p>}
      <div className="sigdlg__foot">
        {mode && (
          <button
            type="button"
            className="btn btn--ghost"
            disabled={!changed}
            onClick={() => {
              if (strokes.current.length) strokes.current.pop();
              else cleared.current = false;
              repaint();
            }}
          >
            復原
          </button>
        )}
        <button
          type="button"
          className="btn btn--ghost"
          disabled={!(ink.strokes || (hadBase && !ink.cleared))}
          onClick={() => {
            strokes.current = [];
            ref.current = null;
            if (hadBase) cleared.current = true;
            repaint();
          }}
        >
          {mode ? '清除全部' : '清除重寫'}
        </button>
        <button type="button" className="btn btn--primary" disabled={!changed} onClick={done}>
          {mode ? '儲存標示' : '完成簽名'}
        </button>
      </div>
    </dialog>
  );
}
