import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { buildMobileClientSummary } from '@/lib/mobile-client-summary';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected client summary error';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken.trim() : '';

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required.' }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: userError?.message || 'The client session is no longer valid.' },
        { status: 401 }
      );
    }

    const summary = await buildMobileClientSummary(user.id, user.email || '');
    return NextResponse.json({ summary });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
