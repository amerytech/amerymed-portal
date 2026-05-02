import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildMobileAdminDashboard, resolveMobileAdminAccess } from '@/lib/mobile-admin';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected admin login error';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user || !data.session) {
      return NextResponse.json(
        { error: error?.message || 'The admin login could not be completed.' },
        { status: 401 }
      );
    }

    const access = await resolveMobileAdminAccess(data.session.access_token);
    const dashboard = await buildMobileAdminDashboard(access);

    return NextResponse.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      dashboard,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
