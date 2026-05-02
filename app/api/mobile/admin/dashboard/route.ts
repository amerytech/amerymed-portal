import { NextRequest, NextResponse } from 'next/server';
import {
  buildMobileAdminDashboard,
  deleteMobileAdminUploads,
  resolveMobileAdminAccess,
  updateMobileAdminUploadNotes,
  updateMobileAdminUploadStatus,
} from '@/lib/mobile-admin';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected admin dashboard error';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken.trim() : '';

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required.' }, { status: 400 });
    }

    const access = await resolveMobileAdminAccess(accessToken);
    const dashboard = await buildMobileAdminDashboard(access);

    return NextResponse.json({ dashboard });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const status = message.toLowerCase().includes('session') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken.trim() : '';
    const uploadId = typeof body?.uploadId === 'string' ? body.uploadId.trim() : '';
    const status = typeof body?.status === 'string' ? body.status.trim() : '';
    const notes = typeof body?.notes === 'string' ? body.notes : '';
    const action = typeof body?.action === 'string' ? body.action.trim() : '';

    if (!accessToken || !uploadId) {
      return NextResponse.json(
        { error: 'Access token and upload id are required.' },
        { status: 400 }
      );
    }

    const access = await resolveMobileAdminAccess(accessToken);

    if (action === 'notes') {
      await updateMobileAdminUploadNotes({ access, uploadId, notes });
    } else {
      if (!status) {
        return NextResponse.json({ error: 'Status is required.' }, { status: 400 });
      }

      await updateMobileAdminUploadStatus({ access, uploadId, status });
    }

    const dashboard = await buildMobileAdminDashboard(access);

    return NextResponse.json({ dashboard });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const lowered = message.toLowerCase();
    const status = lowered.includes('session') ? 401 : lowered.includes('found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken.trim() : '';
    const uploadIds = Array.isArray(body?.uploadIds)
      ? body.uploadIds.filter((id: unknown): id is string => typeof id === 'string')
      : [];

    if (!accessToken || uploadIds.length === 0) {
      return NextResponse.json(
        { error: 'Access token and upload ids are required.' },
        { status: 400 }
      );
    }

    const access = await resolveMobileAdminAccess(accessToken);
    await deleteMobileAdminUploads({ access, uploadIds });
    const dashboard = await buildMobileAdminDashboard(access);

    return NextResponse.json({ dashboard });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const lowered = message.toLowerCase();
    const status = lowered.includes('session') ? 401 : lowered.includes('found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
