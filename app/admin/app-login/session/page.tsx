'use client';

import { useEffect, useState } from 'react';
import { createFreshBrowserSupabaseClient } from '@/lib/supabase-browser';
import styles from '@/components/admin-dashboard.module.css';

async function pause(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForAdminSession() {
  const supabase = createFreshBrowserSupabaseClient();

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const resolvedUser = session?.user ?? (await supabase.auth.getUser()).data.user ?? null;

    if (resolvedUser) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', resolvedUser.id)
        .single();

      if (!error && profile?.role === 'admin') {
        return { ok: true as const };
      }

      if (!error && profile?.role === 'client') {
        return { ok: false as const, redirect: '/client' };
      }
    }

    await pause(300);
  }

  return { ok: false as const, redirect: '/admin/login?retry=session' };
}

export default function AdminSessionBridgePage() {
  const [status, setStatus] = useState('Confirming your staff session...');

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await waitForAdminSession();
      if (cancelled) return;

      if (result.ok) {
        setStatus('Opening your admin workspace...');
        window.location.replace('/admin');
        return;
      }

      setStatus('Refreshing your sign-in...');
      window.location.replace(result.redirect);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.loadingCard}>
        <div className={styles.loadingBadge}>Admin Dashboard</div>
        <h1 className={styles.loadingTitle}>Preparing your session...</h1>
        <p className={styles.loadingText}>{status}</p>
      </div>
    </main>
  );
}
