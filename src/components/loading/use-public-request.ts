'use client';
import { useState, useSyncExternalStore } from 'react';
import { PublicRequestTracker } from '@/lib/public-request';
const serverSnapshot = () => null;
export function usePublicRequest() {
  const [tracker] = useState(() => new PublicRequestTracker());
  const message = useSyncExternalStore(tracker.subscribe, tracker.getSnapshot, serverSnapshot);
  return { message, run: tracker.run };
}
