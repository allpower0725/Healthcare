import { PublicRequestError } from './security/public-protection';
/** 僅追蹤明確包入的網路工作，不攔截 fetch、IndexedDB 或背景工作。 */
export class PublicRequestTracker {
  private jobs = new Map<symbol, string>();
  private listeners = new Set<() => void>();
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = (): string | null => this.jobs.values().next().value ?? null;
  private notify() { for (const listener of this.listeners) listener(); }
  run = async <T>(message: string, work: () => Promise<T>, timeoutMs = 30000): Promise<T> => {
    const id = Symbol();
    this.jobs.set(id, message);
    this.notify();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        Promise.resolve().then(work),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new PublicRequestError('連線等候時間較長，填寫內容已保留，請稍後再試。')), timeoutMs); }),
      ]);
    } finally {
      clearTimeout(timeout);
      this.jobs.delete(id);
      this.notify();
    }
  }
}
