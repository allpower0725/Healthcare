'use client';

const PRINT_ERROR = '無法載入列印內容，請確認連線與登入狀態後再試一次。';
type PrintJob = { promise: Promise<void>; ready: boolean; onReady: Set<() => void> };
let activeJob: PrintJob | null = null;
let previousFrame: HTMLIFrameElement | null = null;

/** 在原畫面準備同源列印文件，避免另開分頁或遺失列表／表單狀態。 */
export function printDocument(href: string, onReady?: () => void): Promise<void> {
  if (activeJob) {
    if (onReady) { if (activeJob.ready) onReady(); else activeJob.onReady.add(onReady); }
    return activeJob.promise;
  }
  const job: PrintJob = { promise: null!, ready: false, onReady: new Set(onReady ? [onReady] : []) };
  activeJob = job;
  job.promise = preparePrint(href, () => {
    job.ready = true;
    for (const callback of job.onReady) callback();
    job.onReady.clear();
  }).finally(() => { if (activeJob === job) activeJob = null; });
  return job.promise;
}

function preparePrint(href: string, beforePrint: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) {
      reject(new Error(PRINT_ERROR));
      return;
    }

    previousFrame?.remove();
    const frame = document.createElement('iframe');
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    frame.title = '列印文件';
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    frame.dataset.printDocument = 'true';
    // 不使用 display:none，讓瀏覽器能計算 A4 版面及載入圖片。
    Object.assign(frame.style, {
      position: 'fixed', left: '-10000px', top: '0', width: '210mm', height: '297mm', border: '0',
    });
    previousFrame = frame;
    let observer: MutationObserver | null = null;
    let started = false;

    const cleanup = () => {
      observer?.disconnect();
      clearTimeout(timeout);
      frame.remove();
      if (previousFrame === frame) previousFrame = null;
      if (focused?.isConnected) focused.focus({ preventScroll: true });
    };
    const fail = () => { cleanup(); reject(new Error(PRINT_ERROR)); };
    const timeout = window.setTimeout(fail, 30000);

    frame.onerror = fail;
    frame.onload = () => {
      const target = frame.contentWindow;
      const doc = frame.contentDocument;
      if (!target || !doc) { fail(); return; }

      const printWhenReady = async () => {
        // Next.js 串流內容必須已插入可排版的文件，才開始列印。
        const page = doc.querySelector<HTMLElement>('.ps-page');
        if (started || !page || page.getBoundingClientRect().width === 0) return;
        started = true;
        observer?.disconnect();
        try {
          await doc.fonts.ready;
          await Promise.all([...doc.querySelectorAll<HTMLImageElement>('.ps-frame img')].map((img) => img.decode().catch(() => {})));
          if (!frame.isConnected) return;
          clearTimeout(timeout);
          target.addEventListener('afterprint', cleanup, { once: true });
          beforePrint();
          target.focus();
          target.print();
          // 部分行動瀏覽器的 print() 不會阻塞；文件保留到 afterprint 才清除。
          resolve();
        } catch {
          fail();
        }
      };

      observer = new MutationObserver(() => { void printWhenReady(); });
      observer.observe(doc.documentElement, { childList: true, subtree: true, attributes: true });
      void printWhenReady();
    };
    frame.src = url.href;
    document.body.append(frame);
  });
}
