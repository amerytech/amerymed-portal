'use client';
import { useEffect, useMemo, useState } from 'react';
import { createFreshBrowserSupabaseClient } from '@/lib/supabase-browser';
import AdminFiles from '@/components/admin-files';
import AdminAuditLog from '@/components/admin-audit-log';
import { AdminPortalChat } from '@/components/portal-chat';
import styles from '@/components/admin-dashboard.module.css';

export default function AdminPage() {
  const supabase = useMemo(() => createFreshBrowserSupabaseClient(), []);


  const [checkingAccess, setCheckingAccess] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  }

  useEffect(() => {
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      const resolvedUser = session?.user ?? (await supabase.auth.getUser()).data.user ?? null;

      if (!resolvedUser) {
        window.location.href = '/admin/login';
        return;
      }
      setUserEmail(resolvedUser.email || '');
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', resolvedUser.id)
        .single();

      if (error || !profile || profile.role !== 'admin') {
        window.location.href = '/client';
        return;
      }

      setAuthorized(true);
      setCheckingAccess(false);
    })();
  }, [supabase]);

  if (checkingAccess) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingCard}>
          <div className={styles.loadingBadge}>Admin Dashboard</div>
          <h1 className={styles.loadingTitle}>Checking staff access...</h1>
          <p className={styles.loadingText}>
            We are validating your account and preparing the operations workspace.
          </p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageInner}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>AmeryMed Admin Workspace</div>
            <h1 className={styles.heroTitle}>Review intake, clean up files, and keep processing moving.</h1>
            <p className={styles.heroText}>
              This dashboard brings uploaded records, status updates, internal notes, and
              audit activity into one calmer workflow for your operations team.
            </p>
          </div>

          <div className={styles.heroMeta}>
            <div className={styles.metaCard}>
              <div className={styles.metaLabel}>Signed in as</div>
              <div className={styles.metaValue}>{userEmail || 'Unknown user'}</div>
            </div>
            <div className={styles.metaCard}>
              <div className={styles.metaLabel}>Workspace</div>
              <div className={styles.metaValue}>Admin intake and audit control</div>
            </div>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Logout
            </button>
          </div>
        </section>

        <div className={styles.stack}>
          <AdminFiles />
          <AdminPortalChat adminEmail={userEmail} />
          <AdminAuditLog />
        </div>
      </div>
    </main>
  );
}
