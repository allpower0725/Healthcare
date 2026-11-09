import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicRequestTracker } from '@/lib/public-request';
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
afterEach(() => vi.useRealTimers());
describe('明確網路等待與 IndexedDB 排除', () => {
  it('不追蹤未包入的本機暫存；只有明確網路工作才顯示等待', async () => {
    const tracker = new PublicRequestTracker(); const local = deferred<void>();
    expect(tracker.getSnapshot()).toBeNull();
    const localSave = local.promise;
    expect(tracker.getSnapshot()).toBeNull();
    const server = deferred<string>(); const request = tracker.run('伺服器處理中', () => server.promise);
    expect(tracker.getSnapshot()).toBe('伺服器處理中');
    server.resolve('ok'); expect(await request).toBe('ok');
    expect(tracker.getSnapshot()).toBeNull();
    local.resolve(); await localSave; expect(tracker.getSnapshot()).toBeNull();
  });
  it('一筆先完成時仍保留另一筆的 loading，全部結束才解除', async () => {
    const tracker = new PublicRequestTracker(); const first = deferred<void>(); const second = deferred<void>();
    const a = tracker.run('讀取中', () => first.promise); const b = tracker.run('送出中', () => second.promise);
    first.resolve(); await a; expect(tracker.getSnapshot()).toBe('送出中');
    second.resolve(); await b; expect(tracker.getSnapshot()).toBeNull();
  });
  it('同步例外與非同步拒絕都解除等待，之後可再次操作', async () => {
    const tracker = new PublicRequestTracker(); const changed = vi.fn(); const unsubscribe = tracker.subscribe(changed);
    await expect(tracker.run('等待中', () => { throw new Error('failed'); })).rejects.toThrow('failed');
    expect(tracker.getSnapshot()).toBeNull();
    await expect(tracker.run('等待中', async () => { throw new Error('failed'); })).rejects.toThrow('failed');
    expect(await tracker.run('重試中', async () => 'saved')).toBe('saved');
    expect(tracker.getSnapshot()).toBeNull(); expect(changed).toHaveBeenCalledTimes(6); unsubscribe();
  });
  it('網路長時間不回應會解除等待，晚到結果不重啟 loading', async () => {
    vi.useFakeTimers(); const tracker = new PublicRequestTracker(); const server = deferred<void>();
    const request = tracker.run('等待中', () => server.promise, 100);
    const failed = expect(request).rejects.toThrow('填寫內容已保留');
    await vi.advanceTimersByTimeAsync(100); await failed;
    expect(tracker.getSnapshot()).toBeNull(); server.resolve(); await Promise.resolve();
    expect(tracker.getSnapshot()).toBeNull();
  });
});
