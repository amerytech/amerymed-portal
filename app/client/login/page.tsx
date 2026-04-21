'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import PortalLoginShell from '@/components/portal-login-shell';

function isTransportErrorMessage(value: string) {
  const normalized = value.trim().toLowerCase();

  return (
    normalized === 'failed to fetch' ||
    normalized === 'load failed' ||
    normalized.includes('network request failed') ||
    normalized.includes('networkerror') ||
    normalized.includes('fetch')
  );
}

function getFriendlyAuthMessage(error: unknown) {
  if (error instanceof Error) {
    if (isTransportErrorMessage(error.message)) {
      return 'The client portal could not reach the secure sign-in service from this device. Please confirm the iPhone app can reach both amerymed-portal.vercel.app and the Supabase project domain, then try again.';
    }

    return error.message;
  }

  if (typeof error === 'string' && isTransportErrorMessage(error)) {
    return 'The client portal could not reach the secure sign-in service from this device. Please confirm the iPhone app can reach both amerymed-portal.vercel.app and the Supabase project domain, then try again.';
  }

  return 'Client sign-in could not be completed. Please try again.';
}

export default function ClientLogin() {
  const supabase = createBrowserSupabaseClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resumeExistingSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user || cancelled) return;

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, client_id')
          .eq('id', session.user.id)
          .single();

        if (cancelled) return;

        if (profileError || !profile) {
          setMessage('An existing session was found, but the client portal profile could not be loaded.');
          return;
        }

        if (profile.role === 'admin') {
          window.location.assign('/admin');
          return;
        }

        if (profile.role === 'client' && profile.client_id) {
          window.location.assign('/client');
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(getFriendlyAuthMessage(error));
        }
      }
    }

    void resumeExistingSession();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setMessage(signInError.message);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage(userError?.message || 'Login succeeded, but your account session did not finish loading. Please try again.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, client_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        setMessage(profileError?.message || 'Login succeeded, but no portal profile was found for this user.');
        return;
      }

      if (profile.role === 'admin') {
        window.location.href = '/admin';
        return;
      }

      if (profile.role !== 'client') {
        setMessage('This account is not configured as a client portal user.');
        return;
      }

      if (!profile.client_id) {
        setMessage('This client account is not linked to a clinic record yet.');
        return;
      }

      window.location.assign('/client');
    } catch (error) {
      setMessage(getFriendlyAuthMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PortalLoginShell
      badge="Secure Medical Intake"
      heroTitle="Client portal access for document upload and tracking."
      heroText="Sign in to securely submit EOBs, face sheets, claims, and supporting billing documents to the AmeryMed team."
      promoLabel="Medical Billing Partnership"
      promoTitle="Help your physicians and clinic staff move documents into the revenue cycle faster."
      promoText="Send billing records through a secure intake path designed to reduce back-and-forth, improve routing accuracy, and support quicker follow-up by the AmeryMed team."
      promoPoints={[
        { label: 'EOB and claims', value: 'Upload billing packets without relying on scattered email threads.' },
        { label: 'Clinic support', value: 'Keep files tied to the right physician, clinic, and patient reference.' },
        { label: 'Turnaround', value: 'Reduce intake confusion and help follow-up start sooner.' },
      ]}
      services={['Medical billing', 'Claims support', 'Face sheets', 'Credentialing', 'Compliance']}
      testimonial={{
        quote:
          'Our physicians needed a simpler way to submit documents, and this portal gives the billing team cleaner information from the start.',
        attribution: 'Clinic intake workflow example',
      }}
      features={[
        {
          title: 'Protected sign-in',
          body: 'Access is tied to your client account and clinic profile.',
        },
        {
          title: 'Clear upload history',
          body: 'Review submitted files and track where each document stands.',
        },
        {
          title: 'Built for billing teams',
          body: 'Categories, patient references, and notes help processing move faster.',
        },
      ]}
      heroImageSrc="/medical-bg.jpg"
      heroImageAlt="Professional medical services"
      heroImageWidth={1600}
      heroImageHeight={1000}
      heroImageVariant="landscape"
      trustPills={['Secure upload access', 'Clinic-linked records', 'Clear document tracking']}
      cardEyebrow="Client Login"
      cardTitle="Welcome back"
      cardText="Enter your client credentials to open the portal."
      emailLabel="Email"
      emailPlaceholder="client@clinic.com"
      email={email}
      onEmailChange={setEmail}
      passwordLabel="Password"
      passwordPlaceholder="Enter your password"
      password={password}
      onPasswordChange={setPassword}
      submitLabel="Access Client Portal"
      submitLoadingLabel="Signing in..."
      loading={loading}
      message={message}
      onSubmit={handleLogin}
      brandMark={{ kind: 'image', src: '/AMedLogo.jpg', alt: 'AmeryMed Logo' }}
      theme={{
        '--page-background':
          'radial-gradient(circle at top right, rgba(15, 118, 110, 0.18), transparent 32%), linear-gradient(135deg, #eff8f6 0%, #eef4fb 52%, #f9fbff 100%)',
        '--brand-background': 'linear-gradient(165deg, #0f766e 0%, #123c7a 62%, #102848 100%)',
        '--brand-shadow': '0 24px 60px rgba(18, 60, 122, 0.18)',
        '--button-background': 'linear-gradient(135deg, #123c7a 0%, #0f766e 100%)',
        '--accent-color': '#0f766e',
        '--mark-background': 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
      }}
    />
  );
}
