import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export type MobileAdminUploadRecord = {
  id: string;
  fileName: string;
  filePath: string | null;
  previewUrl: string | null;
  fileSize: number | null;
  fileType: string | null;
  clinicName: string | null;
  category: string | null;
  patientReference: string | null;
  notes: string | null;
  status: string | null;
  createdAt: string;
};

export type MobileAdminDashboard = {
  userEmail: string;
  totalUploads: number;
  receivedCount: number;
  inReviewCount: number;
  processedCount: number;
  uploads: MobileAdminUploadRecord[];
};

type AdminAccess = {
  userId: string;
  userEmail: string;
};

function normalizeText(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

export async function resolveMobileAdminAccess(accessToken: string): Promise<AdminAccess> {
  const supabase = createAdminSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    throw new Error(userError?.message || 'The admin session is no longer valid.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    throw new Error(profileError?.message || 'Admin profile could not be resolved.');
  }

  return {
    userId: user.id,
    userEmail: user.email || '',
  };
}

export async function buildMobileAdminDashboard(
  access: AdminAccess
): Promise<MobileAdminDashboard> {
  const supabase = createAdminSupabaseClient();

  const { data: uploads, error } = await supabase
    .from('uploads')
    .select(
      'id, file_name, file_path, file_size, file_type, clinic_name, category, patient_reference, notes, status, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const records = await Promise.all(
    (uploads || []).map(async (upload) => {
      const filePath = normalizeText(upload.file_path);
      let previewUrl: string | null = null;

      if (filePath) {
        const { data: signedUrlData } = await supabase.storage
          .from('client-documents')
          .createSignedUrl(filePath, 60 * 15);
        previewUrl = signedUrlData?.signedUrl || null;
      }

      return {
        id: normalizeText(upload.id),
        fileName: normalizeText(upload.file_name),
        filePath: filePath || null,
        previewUrl,
        fileSize: typeof upload.file_size === 'number' ? upload.file_size : null,
        fileType: normalizeText(upload.file_type) || null,
        clinicName: normalizeText(upload.clinic_name) || null,
        category: normalizeText(upload.category) || null,
        patientReference: normalizeText(upload.patient_reference) || null,
        notes: normalizeText(upload.notes) || null,
        status: normalizeText(upload.status) || null,
        createdAt: normalizeText(upload.created_at),
      };
    })
  );

  return {
    userEmail: access.userEmail,
    totalUploads: records.length,
    receivedCount: records.filter((upload) => upload.status === 'received').length,
    inReviewCount: records.filter((upload) => upload.status === 'in_review').length,
    processedCount: records.filter((upload) => upload.status === 'processed').length,
    uploads: records,
  };
}

export async function updateMobileAdminUploadStatus(params: {
  access: AdminAccess;
  uploadId: string;
  status: string;
}) {
  const allowedStatuses = new Set(['received', 'in_review', 'processed']);
  const normalizedStatus = params.status.trim().toLowerCase();

  if (!allowedStatuses.has(normalizedStatus)) {
    throw new Error('Unsupported upload status.');
  }

  const supabase = createAdminSupabaseClient();
  const normalizedUploadId = params.uploadId.trim();

  const { data: upload, error: fetchError } = await supabase
    .from('uploads')
    .select('id, file_name')
    .eq('id', normalizedUploadId)
    .single();

  if (fetchError || !upload) {
    throw new Error(fetchError?.message || 'Upload could not be found.');
  }

  const { error } = await supabase
    .from('uploads')
    .update({ status: normalizedStatus })
    .eq('id', normalizedUploadId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from('audit_logs').insert({
    user_id: params.access.userId,
    user_email: params.access.userEmail || null,
    action: 'STATUS_UPDATE',
    upload_id: normalizedUploadId,
    file_name: normalizeText(upload.file_name) || null,
    details: `Status changed to ${normalizedStatus}`,
  });
}

export async function updateMobileAdminUploadNotes(params: {
  access: AdminAccess;
  uploadId: string;
  notes: string;
}) {
  const supabase = createAdminSupabaseClient();
  const normalizedUploadId = params.uploadId.trim();

  const { data: upload, error: fetchError } = await supabase
    .from('uploads')
    .select('id, file_name')
    .eq('id', normalizedUploadId)
    .single();

  if (fetchError || !upload) {
    throw new Error(fetchError?.message || 'Upload could not be found.');
  }

  const { error } = await supabase
    .from('uploads')
    .update({ notes: params.notes })
    .eq('id', normalizedUploadId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from('audit_logs').insert({
    user_id: params.access.userId,
    user_email: params.access.userEmail || null,
    action: 'NOTES_UPDATE',
    upload_id: normalizedUploadId,
    file_name: normalizeText(upload.file_name) || null,
    details: `Notes updated to: ${params.notes}`,
  });
}

export async function deleteMobileAdminUploads(params: {
  access: AdminAccess;
  uploadIds: string[];
}) {
  const supabase = createAdminSupabaseClient();
  const uploadIds = Array.from(new Set(params.uploadIds.map((id) => id.trim()).filter(Boolean)));

  if (uploadIds.length === 0) {
    throw new Error('At least one upload is required.');
  }

  const { data: uploads, error: fetchError } = await supabase
    .from('uploads')
    .select('id, file_name, file_path')
    .in('id', uploadIds);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!uploads || uploads.length === 0) {
    throw new Error('No uploads could be found.');
  }

  const filePaths = uploads
    .map((upload) => normalizeText(upload.file_path).trim().replace(/^\/+/, ''))
    .filter(Boolean);

  if (filePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from('client-documents')
      .remove(filePaths);

    if (storageError) {
      throw new Error(storageError.message);
    }
  }

  const { error: deleteError } = await supabase.from('uploads').delete().in('id', uploadIds);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  await supabase.from('audit_logs').insert(
    uploads.map((upload) => ({
      user_id: params.access.userId,
      user_email: params.access.userEmail || null,
      action: 'DELETE',
      upload_id: normalizeText(upload.id),
      file_name: normalizeText(upload.file_name) || null,
      details: `Deleted upload and storage object: ${normalizeText(upload.file_path) || 'no path'}`,
    }))
  );
}
