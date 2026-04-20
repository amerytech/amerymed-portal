'use client';

import Image from 'next/image';
import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const supabase = createBrowserSupabaseClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
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
        setMessage('Login succeeded, but user details could not be loaded.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        setMessage('Login succeeded, but no profile was found for this user.');
        return;
      }

      if (profile.role === 'admin') {
        window.location.href = '/admin';
        return;
      }

      if (profile.role === 'client') {
        window.location.href = '/client';
        return;
      }

      setMessage('Login succeeded, but this user role is not recognized.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f4f7fb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '18px',
          }}
        >
          <Image
            src="/AMedLogo.jpg"
            alt="AmeryMed Logo"
            width={52}
            height={52}
            style={{ height: '52px', width: '52px', borderRadius: '10px' }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', color: '#123c7a' }}>
              AmeryMed Login
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#5b6573' }}>
              Sign in to continue
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            placeholder="Enter your email"
            required
          />

          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            placeholder="Enter your password"
            required
          />

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              background: isLoading ? '#6f88b8' : '#123c7a',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
            }}
          >
            {isLoading ? 'Signing in...' : 'Login'}
          </button>

          {message && (
            <div
              style={{
                marginTop: '14px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#fdecec',
                color: '#b42318',
                fontWeight: 600,
              }}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  marginTop: '6px',
  marginBottom: '16px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#111',
  fontSize: '16px',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#1f2937',
  fontWeight: 700,
  marginBottom: '4px',
};
