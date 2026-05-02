import { NextRequest, NextResponse } from 'next/server';
import {
  buildMobileClientUploadHistory,
  resolveMobileClientAccess,
} from '@/lib/mobile-client-uploads';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected client history error';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken.trim() : '';

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required.' }, { status: 400 });
    }

    const access = await resolveMobileClientAccess(accessToken);
    const uploads = await buildMobileClientUploadHistory(access.clientId);

    return NextResponse.json({ uploads });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const status = message.toLowerCase().includes('session') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
