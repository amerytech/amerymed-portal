'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production'
    ) {
      return;
    }

    void navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('PWA service worker registration failed:', error);
    });
  }, []);

  return null;
}
