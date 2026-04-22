'use client';

import { useEffect } from 'react';

function isCapacitorApp() {
  if (typeof window === 'undefined') return false;

  const candidate = window as typeof window & {
    Capacitor?: {
      isNativePlatform?: () => boolean;
    };
  };

  if (typeof candidate.Capacitor?.isNativePlatform === 'function') {
    return candidate.Capacitor.isNativePlatform();
  }

  return false;
}

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    if (isCapacitorApp()) {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch((error) => {
          console.warn('PWA service worker cleanup failed inside Capacitor:', error);
        });
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    void navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('PWA service worker registration failed:', error);
    });
  }, []);

  return null;
}
