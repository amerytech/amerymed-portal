'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import styles from '@/app/client/client-portal.module.css';

const supabase = createBrowserSupabaseClient();

async function pause(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForClientSession() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    console.log(`[client-session] attempt ${attempt + 1}: checking session`);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const resolvedUser = session?.user ?? (await supabase.auth.getUser()).data.user ?? null;

    if (resolvedUser) {
      console.log('[client-session] user resolved', resolvedUser.id);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, client_id')
        .eq('id', resolvedUser.id)
        .single();

      if (!error && profile?.role === 'client' && profile.client_id) {
        console.log('[client-session] client profile resolved', profile.client_id);
        return { ok: true as const };
      }

      if (!error && profile?.role === 'admin') {
        console.log('[client-session] admin profile encountered, redirecting');
        return { ok: false as const, redirect: '/admin' };
      }
    }

    await pause(300);
  }

  return { ok: false as const, redirect: '/client/login?retry=session' };
}

export default function ClientSessionBridgePage() {
  const [status, setStatus] = useState('Confirming your secure session...');

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      console.log('[client-session] bridge started');
      setStatus('Confirming your secure session...');
      const result = await waitForClientSession();
      if (cancelled) return;

      if (result.ok) {
        console.log('[client-session] redirecting to /client');
        setStatus('Opening your client workspace...');
        window.location.replace('/client');
        return;
      }

      console.log('[client-session] redirecting to', result.redirect);
      setStatus('Refreshing your login...');
      window.location.replace(result.redirect);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.loadingCard}>
        <div className={styles.loadingBadge}>Client Portal</div>
        <h1 className={styles.loadingTitle}>Preparing your session...</h1>
        <p className={styles.loadingText}>{status}</p>
      </div>
    </main>
  );
}
