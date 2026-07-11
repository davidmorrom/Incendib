'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/pwa/register-sw';

/** Registra el service worker (offline + Web Push) al montar. Sin UI. */
export function PwaInit() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}
