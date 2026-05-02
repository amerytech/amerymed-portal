import { NextRequest, NextResponse } from 'next/server';
import {
  resolveMobileClientAccess,
  sanitizeStorageFileName,
} from '@/lib/mobile-client-uploads';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected client upload error';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const accessToken = String(formData.get('accessToken') || '').trim();
    const category = String(formData.get('category') || 'EOB').trim() || 'EOB';
    const patientReference = String(formData.get('patientReference') || '').trim();
    const notes = String(formData.get('notes') || '').trim();
    const files = formData
      .getAll('files')
      .filter((value): value is File => typeof File !== 'undefined' && value instanceof File);

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required.' }, { status: 400 });
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'At least one file is required.' }, { status: 400 });
    }

    const access = await resolveMobileClientAccess(accessToken);
    const supabase = createAdminSupabaseClient();

    for (const file of files) {
      const safeFileName = sanitizeStorageFileName(file.name || 'upload');
      const filePath = `uploads/${Date.now()}_${safeFileName}`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      const { error: storageError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, fileBuffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (storageError) {
        throw new Error(storageError.message);
      }

      const { error: dbError } = await supabase.from('uploads').insert({
        client_id: access.clientId,
        uploaded_by: access.userId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type || 'application/octet-stream',
        clinic_name: access.clinicName,
        category,
        notes,
        patient_reference: patientReference,
        status: 'received',
      });

      if (dbError) {
        throw new Error(dbError.message);
      }
    }

    return NextResponse.json({
      success: true,
      uploadedCount: files.length,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const lowered = message.toLowerCase();
    const status =
      lowered.includes('session') || lowered.includes('profile') || lowered.includes('client')
        ? 401
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
