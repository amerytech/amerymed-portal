import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import {
  resolveMobileClientAccess,
  sanitizeStorageFileName,
} from '@/lib/mobile-client-uploads';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected client upload error';
}

function normalizeText(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

async function isDuplicateUpload(params: {
  supabase: ReturnType<typeof createAdminSupabaseClient>;
  clientId: string;
  category: string;
  patientReference: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileBuffer: Buffer;
}) {
  const { supabase, clientId, category, patientReference, fileName, fileType, fileSize, fileBuffer } = params;
  const { data: candidates, error } = await supabase
    .from('uploads')
    .select('id, file_name, file_path, file_size, file_type, category, patient_reference')
    .eq('client_id', clientId)
    .eq('category', category)
    .eq('patient_reference', patientReference);

  if (error) {
    throw new Error(error.message);
  }

  if (!candidates?.length) {
    return false;
  }

  const incomingHash = createHash('sha256').update(fileBuffer).digest('hex');
  const normalizedIncomingName = normalizeText(fileName);
  const normalizedIncomingType = normalizeText(fileType);
  const incomingFamily = normalizedIncomingType.split('/')[0] || normalizedIncomingType;

  for (const candidate of candidates) {
    const normalizedExistingName = normalizeText(candidate.file_name);
    const normalizedExistingType = normalizeText(candidate.file_type);
    const existingFamily = normalizedExistingType.split('/')[0] || normalizedExistingType;
    const sameMetadata =
      normalizedExistingName === normalizedIncomingName &&
      normalizedExistingType === normalizedIncomingType;

    if (sameMetadata) {
      return true;
    }

    if (
      typeof candidate.file_size === 'number' &&
      candidate.file_size === fileSize &&
      normalizedExistingType === normalizedIncomingType
    ) {
      return true;
    }

    if (
      normalizeText(category) === 'insurancecard' &&
      existingFamily === incomingFamily &&
      typeof candidate.file_size === 'number' &&
      Math.abs(candidate.file_size - fileSize) <= 16384
    ) {
      return true;
    }

    const existingPath = typeof candidate.file_path === 'string' ? candidate.file_path : '';
    if (!existingPath) {
      continue;
    }

    const { data: storedFile, error: downloadError } = await supabase.storage
      .from('client-documents')
      .download(existingPath);

    if (downloadError || !storedFile) {
      continue;
    }

    const storedHash = createHash('sha256')
      .update(Buffer.from(await storedFile.arrayBuffer()))
      .digest('hex');

    if (storedHash === incomingHash) {
      return true;
    }
  }

  return false;
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
      const duplicateFound = await isDuplicateUpload({
        supabase,
        clientId: access.clientId,
        category,
        patientReference,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        fileBuffer,
      });

      if (duplicateFound) {
        return NextResponse.json(
          { error: `A duplicate document already exists for ${category} and patient reference ${patientReference}.` },
          { status: 409 }
        );
      }

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
