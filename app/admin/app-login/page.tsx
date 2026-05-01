'use client';

import { useMemo, useState } from 'react';
import { createFreshBrowserSupabaseClient } from '@/lib/supabase-browser';
import PortalLoginShell from '@/components/portal-login-shell';

async function pause(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForPersistedAdminSession(
  supabase: ReturnType<typeof createFreshBrowserSupabaseClient>,
  timeoutMs = 12000
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
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
        return true;
      }
    }

    await pause(150);
  }

  return false;
}

export default function AdminAppLoginPage() {
  const supabase = useMemo(() => createFreshBrowserSupabaseClient(), []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setMessage(signInError.message);
        return;
      }

      if (signInData.session?.access_token && signInData.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
        });
      }

      const sessionReady = await waitForPersistedAdminSession(supabase);

      if (!sessionReady) {
        window.location.replace('/admin/session?retry=1');
        return;
      }

      window.location.replace('/admin/session');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Admin sign-in could not be completed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PortalLoginShell
      badge="Internal Operations"
      heroTitle="Admin access for intake review, triage, and document operations."
      heroText="Sign in with an authorized staff account to manage uploads, update processing status, review notes, and track audit activity across the portal."
      promoLabel="Revenue Cycle Support"
      promoTitle="Stronger revenue-cycle visibility and faster document turnaround start here."
      promoText="Give your billing team a cleaner intake path for EOBs, claims support, compliance documentation, and follow-up work so fewer records stall between upload and action."
      promoPoints={[
        { label: 'Claims workflow', value: 'Triage files faster for review, posting, and follow-up.' },
        { label: 'Denial support', value: 'Keep notes, handoffs, and status changes visible to the team.' },
        { label: 'Turnaround', value: 'Reduce intake delays before records move into billing action.' },
      ]}
      services={['Billing', 'Coding', 'Credentialing', 'Compliance', 'Audit trail']}
      testimonial={{
        quote:
          'This gives our operations team a clearer intake path, faster review, and fewer missed details before billing follow-up begins.',
        attribution: 'AmeryMed operations workflow example',
      }}
      features={[
        {
          title: 'Upload triage',
          body: 'Filter documents by status, clinic, category, and date range.',
        },
        {
          title: 'Operational controls',
          body: 'Preview files, export views, update notes, and remove stale records.',
        },
        {
          title: 'Audit visibility',
          body: 'Review who changed what and when from a single internal workspace.',
        },
      ]}
      heroImageSrc="/AMedLogoadmin.jpg"
      heroImageAlt="AmeryMed administrative services"
      heroImageWidth={1200}
      heroImageHeight={1800}
      heroImageVariant="portrait"
      trustPills={['Staff-only access', 'Operational oversight', 'Protected workflow']}
      cardEyebrow="Admin App Login"
      cardTitle="Welcome back"
      cardText="Use your staff credentials to open the admin dashboard."
      emailLabel="Email"
      emailPlaceholder="staff@amerymed.com"
      email={email}
      onEmailChange={setEmail}
      passwordLabel="Password"
      passwordPlaceholder="Enter your password"
      password={password}
      onPasswordChange={setPassword}
      submitLabel="Enter Admin Portal"
      submitLoadingLabel="Signing in..."
      loading={loading}
      message={message}
      onSubmit={handleLogin}
      brandMark={{ kind: 'image', src: '/AMedLogo.jpg', alt: 'AmeryMed Logo' }}
      theme={{
        '--page-background':
          'radial-gradient(circle at top left, rgba(18, 60, 122, 0.18), transparent 30%), linear-gradient(135deg, #eef4fb 0%, #f8fbff 52%, #eef7f3 100%)',
        '--brand-background': 'linear-gradient(165deg, #123c7a 0%, #0f2f5e 58%, #102848 100%)',
        '--brand-shadow': '0 24px 60px rgba(18, 60, 122, 0.18)',
        '--button-background': 'linear-gradient(135deg, #123c7a 0%, #0f2f5e 100%)',
        '--accent-color': '#123c7a',
        '--mark-background': 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
      }}
    />
  );
}
