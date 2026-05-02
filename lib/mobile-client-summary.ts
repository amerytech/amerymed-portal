import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { resolveMobileClientAccess } from '@/lib/mobile-client-uploads';

export type MobileClientSummary = {
  userEmail: string;
  clientId: string;
  clinicName: string;
  practiceName: string;
  displayName: string;
  providerNpi: string;
  providerAddress: string;
  providerContactEmail: string;
  totalUploads: number;
  receivedCount: number;
  inReviewCount: number;
  processedCount: number;
};

function normalizeText(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

export async function buildMobileClientSummary(userId: string, userEmail: string) {
  const supabase = createAdminSupabaseClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, client_id')
    .eq('id', userId)
    .single();

  if (profileError || profile?.role !== 'client' || !profile.client_id) {
    throw new Error(profileError?.message || 'Client profile could not be resolved.');
  }

  const clientId = profile.client_id;

  const { data: clientRow, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (clientError || !clientRow) {
    throw new Error(clientError?.message || 'Client record could not be resolved.');
  }

  const { data: uploads, error: uploadsError } = await supabase
    .from('uploads')
    .select('status')
    .eq('client_id', clientId);

  if (uploadsError) {
    throw new Error(uploadsError.message);
  }

  const statusCounts = {
    received: 0,
    inReview: 0,
    processed: 0,
  };

  for (const upload of uploads || []) {
    const normalizedStatus = normalizeText(upload.status)
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');

    if (normalizedStatus === 'received') {
      statusCounts.received += 1;
    } else if (normalizedStatus === 'in_review') {
      statusCounts.inReview += 1;
    } else if (normalizedStatus === 'processed') {
      statusCounts.processed += 1;
    }
  }

  return {
    userEmail,
    clientId,
    clinicName: normalizeText(clientRow.clinic_name),
    practiceName: normalizeText(clientRow.practice_name),
    displayName:
      normalizeText(clientRow.display_name) ||
      normalizeText(clientRow.physician_name) ||
      normalizeText(clientRow.contact_name),
    providerNpi: normalizeText(clientRow.individual_npi),
    providerAddress: normalizeText(clientRow.address),
    providerContactEmail: normalizeText(clientRow.contact_email),
    totalUploads: (uploads || []).length,
    receivedCount: statusCounts.received,
    inReviewCount: statusCounts.inReview,
    processedCount: statusCounts.processed,
} satisfies MobileClientSummary;
}

export async function buildMobileClientSummaryForAccessToken(accessToken: string) {
  const access = await resolveMobileClientAccess(accessToken);
  return buildMobileClientSummary(access.userId, access.userEmail);
}
