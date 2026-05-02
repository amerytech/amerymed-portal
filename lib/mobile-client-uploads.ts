import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export type MobileClientUploadRecord = {
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

type ClientAccess = {
  userId: string;
  userEmail: string;
  clientId: string;
  clinicName: string;
};

function normalizeText(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

export function sanitizeStorageFileName(fileName: string) {
  const trimmed = fileName.trim();
  const dotIndex = trimmed.lastIndexOf('.');
  const rawBaseName = dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed;
  const rawExtension = dotIndex > 0 ? trimmed.slice(dotIndex + 1) : '';

  const safeBaseName = rawBaseName
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  const safeExtension = rawExtension
    .normalize('NFKD')
    .replace(/[^\w]+/g, '')
    .toLowerCase();

  const normalizedBaseName = safeBaseName || 'file';
  return safeExtension ? `${normalizedBaseName}.${safeExtension}` : normalizedBaseName;
}

export async function resolveMobileClientAccess(accessToken: string): Promise<ClientAccess> {
  const supabase = createAdminSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    throw new Error(userError?.message || 'The client session is no longer valid.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, client_id')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'client' || !profile.client_id) {
    throw new Error(profileError?.message || 'Client profile could not be resolved.');
  }

  const { data: clientRow, error: clientError } = await supabase
    .from('clients')
    .select('clinic_name')
    .eq('id', profile.client_id)
    .single();

  if (clientError || !clientRow) {
    throw new Error(clientError?.message || 'Client record could not be resolved.');
  }

  return {
    userId: user.id,
    userEmail: user.email || '',
    clientId: profile.client_id,
    clinicName: normalizeText(clientRow.clinic_name),
  };
}

export async function buildMobileClientUploadHistory(
  clientId: string
): Promise<MobileClientUploadRecord[]> {
  const supabase = createAdminSupabaseClient();

  const { data: uploads, error } = await supabase
    .from('uploads')
    .select(
      'id, file_name, file_path, file_size, file_type, clinic_name, category, patient_reference, notes, status, created_at'
    )
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return Promise.all(
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
}

export async function deleteMobileClientUpload(params: {
  clientId: string;
  uploadId: string;
}) {
  const supabase = createAdminSupabaseClient();
  const normalizedUploadId = normalizeText(params.uploadId);

  const { data: upload, error: fetchError } = await supabase
    .from('uploads')
    .select('id, client_id, file_path')
    .eq('id', normalizedUploadId)
    .eq('client_id', params.clientId)
    .single();

  if (fetchError || !upload) {
    throw new Error(fetchError?.message || 'Upload could not be found.');
  }

  const filePath = normalizeText(upload.file_path);
  if (filePath) {
    const { error: storageError } = await supabase.storage
      .from('client-documents')
      .remove([filePath]);

    if (storageError) {
      throw new Error(storageError.message);
    }
  }

  const { error: deleteError } = await supabase
    .from('uploads')
    .delete()
    .eq('id', normalizedUploadId)
    .eq('client_id', params.clientId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }
}
