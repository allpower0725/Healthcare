import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
beforeEach(() => vi.resetModules());
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

function browser(pageReady = true) {
  const order: string[] = []; const listeners: Record<string, () => void> = {};
  class Element { isConnected = true; focus = vi.fn(); }
  const focused = new Element();
  const frame = { style: {}, dataset: {}, isConnected: true, setAttribute: vi.fn(), remove: vi.fn(() => { frame.isConnected = false; }), onload: null as null | (() => void), onerror: null as null | (() => void), src: '', contentWindow: {
    addEventListener: (name: string, listener: () => void) => { listeners[name] = listener; }, focus: vi.fn(), print: vi.fn(() => { order.push('native-print'); }),
  }, contentDocument: { documentElement: {}, fonts: { ready: Promise.resolve() }, querySelector: () => pageReady ? { getBoundingClientRect: () => ({ width: 794 }) } : null,
    querySelectorAll: () => [{ decode: async () => { order.push('image-decoded'); } }],
  } };
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('MutationObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('window', { location: { href: 'https://example.test/f/labor', origin: 'https://example.test' }, setTimeout });
  const append = vi.fn();
  vi.stubGlobal('document', { activeElement: focused, createElement: () => frame, body: { append } });
  return { frame, order, listeners, append, focused };
}

describe('列印準備遮罩', () => {
  it('圖片載入完成後先關閉所有等待遮罩，再開原生列印；重複點擊共用同一工作', async () => {
    const test = browser(); const { printDocument } = await import('@/components/forms/print-document');
    const first = printDocument('/print', () => { test.order.push('first-overlay-closed'); });
    const second = printDocument('/print', () => { test.order.push('second-overlay-closed'); });
    expect(second).toBe(first); expect(test.append).toHaveBeenCalledOnce();
    test.frame.onload!(); await first;
    expect(test.order).toEqual(['image-decoded', 'first-overlay-closed', 'second-overlay-closed', 'native-print']);
    test.listeners.afterprint(); expect(test.frame.remove).toHaveBeenCalledOnce(); expect(test.focused.focus).toHaveBeenCalledWith({ preventScroll: true });
  });
  it('載入失敗可回覆錯誤並移除文件，之後仍可重試', async () => {
    const test = browser(); const { printDocument } = await import('@/components/forms/print-document');
    const failed = printDocument('/print'); const checked = expect(failed).rejects.toThrow('無法載入列印內容');
    test.frame.onerror!(); await checked; expect(test.frame.remove).toHaveBeenCalledOnce();
    test.frame.isConnected = true; const retry = printDocument('/print'); test.frame.onload!(); await retry;
    expect(test.frame.contentWindow.print).toHaveBeenCalledOnce(); test.listeners.afterprint();
  });
  it('串流未提供列印頁面時，逾時會拒絕並清理，不永久等待', async () => {
    vi.useFakeTimers(); const test = browser(false); const { printDocument } = await import('@/components/forms/print-document');
    const request = printDocument('/print'); const checked = expect(request).rejects.toThrow('無法載入列印內容');
    test.frame.onload!(); await vi.advanceTimersByTimeAsync(30000); await checked;
    expect(test.frame.remove).toHaveBeenCalledOnce(); expect(test.frame.contentWindow.print).not.toHaveBeenCalled();
  });
});
