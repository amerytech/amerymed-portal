'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { ClientPortalChat } from '@/components/portal-chat';
import styles from '@/app/client/client-portal.module.css';

type UploadRow = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  clinic_name: string | null;
  category: string | null;
  patient_reference: string | null;
  notes: string | null;
  status: string | null;
  created_at: string;
};

type IndustryUpdateRow = {
  id: string;
  title: string;
  summary: string | null;
  topic: string | null;
  source_name: string | null;
  source_url: string | null;
  published_at: string | null;
  audience: string | null;
  is_published: boolean | null;
};

type ClientIdentityRow = {
  clinic_name: string | null;
  physician_name?: string | null;
  practice_name?: string | null;
  address?: string | null;
  individual_npi?: string | number | null;
  contact_email?: string | null;
  display_name?: string | null;
};

type PortalState = 'checking' | 'ready' | 'blocked';
type CapturePreset = 'general' | 'insurance-front' | 'insurance-back' | 'paper-packet';

const supabase = createBrowserSupabaseClient();

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatFeedDate(value: string | null) {
  if (!value) return 'Published recently';

  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function humanizeIdentifier(value: string) {
  return value
    .replace(/[_.\-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function fetchJsonWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = 12000): Promise<T> {
  let timeoutHandle = 0;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = window.setTimeout(() => {
          reject(new Error(`Timed out while ${label}.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    window.clearTimeout(timeoutHandle);
  }
}

async function pause(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function resolveAuthenticatedUser() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const sessionResult = await withTimeout(supabase.auth.getSession(), 'loading your session');
    const sessionUser = sessionResult.data.session?.user ?? null;

    if (sessionUser) {
      return sessionUser;
    }

    const userResult = await withTimeout(supabase.auth.getUser(), 'rechecking your signed-in user');
    const user = userResult.data.user ?? null;

    if (user) {
      return user;
    }

    await pause(250);
  }

  return null;
}

function sanitizeStorageFileName(fileName: string) {
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

function isCapacitorApp() {
  if (typeof window === 'undefined') return false;

  const candidate = window as typeof window & {
    Capacitor?: {
      isNativePlatform?: () => boolean;
    };
  };

  if (typeof candidate.Capacitor?.isNativePlatform === 'function') {
    return candidate.Capacitor.isNativePlatform();
  }

  return false;
}

export default function ClientPage() {
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);
  const standardFileInputRef = useRef<HTMLInputElement | null>(null);
  const loadRunIdRef = useRef(0);
  const loadingStepRef = useRef('Verifying your account session...');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [capturePreset, setCapturePreset] = useState<CapturePreset>('general');
  const [clinicName, setClinicName] = useState('');
  const [practiceName, setPracticeName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [providerAddress, setProviderAddress] = useState('');
  const [providerNpi, setProviderNpi] = useState('');
  const [providerContactEmail, setProviderContactEmail] = useState('');
  const [category, setCategory] = useState('EOB');
  const [patientReference, setPatientReference] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [sessionEmail, setSessionEmail] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [history, setHistory] = useState<UploadRow[]>([]);
  const [historyMessage, setHistoryMessage] = useState('Loading upload history...');
  const [industryUpdates, setIndustryUpdates] = useState<IndustryUpdateRow[]>([]);
  const [industryUpdatesMessage, setIndustryUpdatesMessage] = useState('Checking live feed...');
  const [clientId, setClientId] = useState('');
  const [portalState, setPortalState] = useState<PortalState>('checking');
  const [portalLoadError, setPortalLoadError] = useState('');
  const [loadingStep, setLoadingStep] = useState('Verifying your account session...');
  const [isNativeWrapper, setIsNativeWrapper] = useState(false);

  useEffect(() => {
    loadingStepRef.current = loadingStep;
  }, [loadingStep]);

  useEffect(() => {
    setIsNativeWrapper(isCapacitorApp());
  }, []);

  const effectiveClinicName = practiceName || clinicName;
  const personalizedDestination =
    displayName && effectiveClinicName
      ? `${displayName}, ${effectiveClinicName}`
      : displayName || effectiveClinicName || clinicName;

  const welcomeTitle = personalizedDestination
    ? `Welcome to ${personalizedDestination}.`
    : 'Welcome to your AmeryMed client workspace.';
  const welcomeText = personalizedDestination
    ? `Review uploads for ${personalizedDestination}, send new billing documents, and keep every file tied to the right patient reference and clinic workflow.`
    : 'Submit billing packets, review previous uploads, and keep every document tied to the right clinic and patient reference.';

  async function loadProfileAndHistory() {
    const runId = Date.now();
    loadRunIdRef.current = runId;
    setPortalState('checking');
    setPortalLoadError('');
    setLoadingStep('Verifying your account session...');

    try {
      const resolvedUser = await resolveAuthenticatedUser();

      if (loadRunIdRef.current !== runId) return;

      if (!resolvedUser) {
        setPortalLoadError('No active mobile session was found. Please sign in again from the client login page.');
        setPortalState('blocked');
        return;
      }

      setSessionEmail(resolvedUser.email || '');
      const metadata = resolvedUser.user_metadata || {};
      const emailLocalPart = (resolvedUser.email || '').split('@')[0] || '';
      const metadataDisplayName =
        metadata.display_name ||
        metadata.full_name ||
        metadata.name ||
        metadata.physician_name ||
        metadata.doctor_name ||
        humanizeIdentifier(emailLocalPart);
      setDisplayName(metadataDisplayName);

      setLoadingStep('Loading your client profile...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, client_id')
        .eq('id', resolvedUser.id)
        .single()
        .then((result) => withTimeout(Promise.resolve(result), 'loading your portal profile'));

      if (loadRunIdRef.current !== runId) return;

      if (profileError || !profile) {
        setClientId('');
        setClinicName('');
        setPracticeName('');
        setProviderAddress('');
        setProviderNpi('');
        setProviderContactEmail('');
        setHistory([]);
        setHistoryMessage('We could not load your client profile.');
        setPortalLoadError('Login succeeded, but no matching portal profile was found for this user.');
        setPortalState('blocked');
        return;
      }

      if (profile.role === 'admin') {
        window.location.href = '/admin';
        return;
      }

      if (profile.role !== 'client' || !profile.client_id) {
        setClientId('');
        setClinicName('');
        setPracticeName('');
        setProviderAddress('');
        setProviderNpi('');
        setProviderContactEmail('');
        setHistory([]);
        setHistoryMessage('No client profile is linked to this login.');
        setPortalLoadError('This login is missing a linked client account. Please verify the QA user profile mapping.');
        setPortalState('blocked');
        return;
      }

      setClientId(profile.client_id);

      setLoadingStep('Loading your clinic record...');
      const { data: clientRow, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', profile.client_id)
        .single()
        .then((result) => withTimeout(Promise.resolve(result), 'loading your clinic record'));

      if (clientError) {
        setClinicName('');
        setPracticeName('');
        setProviderAddress('');
        setProviderNpi('');
        setProviderContactEmail('');
        setHistory([]);
        setHistoryMessage('Your clinic profile could not be loaded.');
        setPortalLoadError('Your client record could not be loaded after login.');
        setPortalState('blocked');
        return;
      }

      const clientRecord = (clientRow || {}) as ClientIdentityRow;
      const derivedClinicName = clientRecord.clinic_name || '';
      const derivedPracticeName =
        clientRecord.practice_name ||
        derivedClinicName;
      const derivedDisplayName =
        clientRecord.physician_name ||
        clientRecord.display_name ||
        metadataDisplayName;

      setClinicName(derivedClinicName);
      setPracticeName(derivedPracticeName || '');
      setDisplayName(derivedDisplayName || '');
      setProviderAddress(clientRecord.address || '');
      setProviderNpi(String(clientRecord.individual_npi || ''));
      setProviderContactEmail(clientRecord.contact_email || resolvedUser.email || '');

      void (async () => {
        try {
          await fetchJsonWithTimeout('/api/industry-updates/sync', { method: 'POST' }, 10000);
        } catch {
          // If sync fails, the portal still falls back to existing DB items or starter updates.
        }

        try {
          const updatesResponse = await fetchJsonWithTimeout('/api/industry-updates/sync', { method: 'GET' }, 10000);
          const updatesPayload = await updatesResponse.json().catch(() => null);
          const updatesData = updatesPayload?.items as IndustryUpdateRow[] | undefined;

          if (!updatesResponse.ok) {
            setIndustryUpdates([]);
            setIndustryUpdatesMessage('Live feed is temporarily unavailable. Please try again shortly.');
          } else if (updatesData && updatesData.length > 0) {
            setIndustryUpdates(updatesData);
            setIndustryUpdatesMessage('');
          } else {
            setIndustryUpdates([]);
            setIndustryUpdatesMessage('No live feed items are available yet.');
          }
        } catch {
          setIndustryUpdates([]);
          setIndustryUpdatesMessage('Live feed is temporarily unavailable. Please try again shortly.');
        }
      })();

      setLoadingStep('Loading your upload history...');
      const { data: uploads, error: uploadsError } = await supabase
        .from('uploads')
        .select(
          'id, file_name, file_path, file_size, file_type, clinic_name, category, patient_reference, notes, status, created_at'
        )
        .eq('client_id', profile.client_id)
        .order('created_at', { ascending: false })
        .then((result) => withTimeout(Promise.resolve(result), 'loading your upload history'));

      if (loadRunIdRef.current !== runId) return;

      if (uploadsError) {
        setHistory([]);
        setHistoryMessage(`Failed to load upload history: ${uploadsError.message}`);
        setPortalState('ready');
        return;
      }

      setHistory(uploads || []);
      setHistoryMessage('');
      setPortalState('ready');
    } catch (error) {
      const message = getErrorMessage(error);
      setClientId('');
      setHistory([]);
      setHistoryMessage('Your portal could not finish loading on this device.');
      setPortalLoadError(`The client portal hit a loading error: ${message}`);
      setPortalState('blocked');
    }
  }

  useEffect(() => {
    const watchdogId = window.setTimeout(() => {
      if (loadRunIdRef.current !== 0) {
        setPortalLoadError(
          `The client portal stayed on "${loadingStepRef.current}" too long. Please sign in again or retry from the client login page.`
        );
        setPortalState('blocked');
      }
    }, 20000);

    void loadProfileAndHistory();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadProfileAndHistory();
    });

    return () => {
      window.clearTimeout(watchdogId);
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/client/login';
  }

  function appendFiles(nextFiles: File[]) {
    if (nextFiles.length === 0) return;

    setSelectedFiles((current) => {
      const seen = new Set(current.map((item) => `${item.name}-${item.size}-${item.lastModified}`));
      const additions = nextFiles.filter(
        (item) => !seen.has(`${item.name}-${item.size}-${item.lastModified}`)
      );
      return [...current, ...additions];
    });
  }

  function handleFileSelection(nextFile: File | null) {
    appendFiles(nextFile ? [nextFile] : []);
  }

  function handleFileBatchSelection(fileList: FileList | null) {
    appendFiles(fileList ? Array.from(fileList) : []);
  }

  function removeSelectedFile(indexToRemove: number) {
    setSelectedFiles((current) => current.filter((_, index) => index !== indexToRemove));
  }

  function clearSelectedFiles() {
    setSelectedFiles([]);
  }

  function applyCapturePreset(preset: CapturePreset) {
    setCapturePreset(preset);

    if (preset === 'insurance-front') {
      setCategory('InsuranceCard');
      setNotes((current) => current || 'Insurance card front image captured from mobile device.');
      return;
    }

    if (preset === 'insurance-back') {
      setCategory('InsuranceCard');
      setNotes((current) => current || 'Insurance card back image captured from mobile device.');
      return;
    }

    if (preset === 'paper-packet') {
      setNotes((current) => current || 'Mobile photo capture for paper document packet.');
    }
  }

  const previewInfo = useMemo(() => {
    if (selectedFiles.length === 0) return null;

    const firstFile = selectedFiles[0];

    return {
      name: firstFile.name,
      size: formatFileSize(firstFile.size),
      type: firstFile.type || 'Unknown',
      isImage: firstFile.type.startsWith('image/'),
      imageUrl: firstFile.type.startsWith('image/') ? URL.createObjectURL(firstFile) : '',
    };
  }, [selectedFiles]);

  useEffect(() => {
    return () => {
      if (previewInfo?.imageUrl) {
        URL.revokeObjectURL(previewInfo.imageUrl);
      }
    };
  }, [previewInfo]);

  const duplicateMatches = useMemo(() => {
    if (!history.length) return [];

    const normalizedCategory = category.trim().toLowerCase();
    const normalizedPatientRef = patientReference.trim().toLowerCase();
    const normalizedFileNames = selectedFiles
      .map((item) => item.name.trim().toLowerCase())
      .filter(Boolean);

    return history.filter((item) => {
      const sameFileName =
        normalizedFileNames.length > 0 &&
        normalizedFileNames.includes((item.file_name || '').trim().toLowerCase());

      const sameCategory =
        normalizedCategory &&
        (item.category || '').trim().toLowerCase() === normalizedCategory;

      const samePatientRef =
        normalizedPatientRef &&
        (item.patient_reference || '').trim().toLowerCase() === normalizedPatientRef;

      return sameFileName || (sameCategory && samePatientRef && normalizedPatientRef !== '');
    });
  }, [history, selectedFiles, category, patientReference]);

  const stats = useMemo(() => {
    const receivedCount = history.filter((item) => item.status === 'received').length;
    const inReviewCount = history.filter((item) => item.status === 'in_review').length;
    const processedCount = history.filter((item) => item.status === 'processed').length;
    const lastUpload = history[0]?.created_at ? formatDate(history[0].created_at) : 'No uploads yet';

    return [
      { label: 'Total uploads', value: String(history.length) },
      { label: 'Pending review', value: String(receivedCount + inReviewCount) },
      { label: 'Processed', value: String(processedCount) },
      { label: 'Last upload', value: lastUpload },
    ];
  }, [history]);

  const captureChecklist = useMemo(() => {
    if (capturePreset === 'insurance-front') {
      return [
        'Place the front of the card on a dark flat surface.',
        'Keep the member ID and payer logo fully inside the frame.',
        'Avoid flash glare across the plastic card.',
      ];
    }

    if (capturePreset === 'insurance-back') {
      return [
        'Capture the full back of the card, including claims and phone details.',
        'Hold the phone directly above the card to avoid blur.',
        'If tiny text is hard to read, move closer before taking the photo.',
      ];
    }

    if (capturePreset === 'paper-packet') {
      return [
        'Flatten each page before taking the next photo.',
        'Use one upload per packet or page set so review stays organized.',
        'Add patient reference or DOS in the note if the file name is generic.',
      ];
    }

    return [
      'Use the rear camera when possible for clearer document images.',
      'Good lighting and a dark background improve readability.',
      'Choose the matching category before upload so the billing team can route it faster.',
    ];
  }, [capturePreset]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    if (portalState !== 'ready') {
      setMessage('Your portal is still loading. Please try again in a moment.');
      setMessageType('error');
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage('No active session found.');
      setMessageType('error');
      return;
    }

    if (!clientId) {
      setMessage('No client account is linked to this login.');
      setMessageType('error');
      return;
    }

    if (selectedFiles.length === 0) {
      setMessage('Please choose at least one file before uploading.');
      setMessageType('error');
      return;
    }

    if (duplicateMatches.length > 0) {
      const confirmed = window.confirm(
        'A similar upload already exists. Do you still want to continue?'
      );

      if (!confirmed) {
        setMessage('Upload cancelled because a possible duplicate was found.');
        setMessageType('error');
        return;
      }
    }

    try {
      setIsUploading(true);
      for (const item of selectedFiles) {
        const safeFileName = sanitizeStorageFileName(item.name);
        const filePath = `uploads/${Date.now()}_${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('client-documents')
          .upload(filePath, item);

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { error: dbError } = await supabase.from('uploads').insert({
          client_id: clientId,
          uploaded_by: session.user.id,
          file_name: item.name,
          file_path: filePath,
          file_size: item.size,
          file_type: item.type,
          clinic_name: clinicName,
          category,
          notes,
          patient_reference: patientReference,
          status: 'received',
        });

        if (dbError) {
          throw new Error(dbError.message);
        }
      }

      try {
        const notifyResponse = await fetch('/api/notify-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clinicName,
            category,
            patientReference,
            notes,
            fileName:
              selectedFiles.length === 1
                ? selectedFiles[0].name
                : `${selectedFiles.length} files captured and uploaded`,
            uploadedBy: session.user.email,
            uploadedAt: new Date().toLocaleString(),
          }),
        });

        if (!notifyResponse.ok) {
          await notifyResponse.json().catch(() => null);
        }
      } catch (notifyError: unknown) {
        console.warn(
          'Upload notification skipped during QA testing:',
          notifyError instanceof Error ? notifyError.message : 'Notification request failed'
        );
      }

      setMessage(
        selectedFiles.length === 1
          ? 'Upload saved successfully.'
          : `${selectedFiles.length} files saved successfully.`
      );
      setMessageType('success');

      setSelectedFiles([]);
      setPatientReference('');
      setNotes('');
      setCategory('EOB');
      setCapturePreset('general');

      await loadProfileAndHistory();
    } catch (error: unknown) {
      setMessage(`Upload failed: ${getErrorMessage(error)}`);
      setMessageType('error');
    } finally {
      setIsUploading(false);
    }
  }

  function getStatusStyle(status: string | null): React.CSSProperties {
    switch (status) {
      case 'received':
        return {
          background: 'rgba(56, 189, 248, 0.12)',
          color: '#0c4a6e',
          border: '1px solid rgba(14, 116, 144, 0.18)',
        };
      case 'in_review':
        return {
          background: 'rgba(245, 158, 11, 0.14)',
          color: '#92400e',
          border: '1px solid rgba(217, 119, 6, 0.2)',
        };
      case 'processed':
        return {
          background: 'rgba(34, 197, 94, 0.14)',
          color: '#166534',
          border: '1px solid rgba(22, 163, 74, 0.2)',
        };
      default:
        return {
          background: 'rgba(148, 163, 184, 0.12)',
          color: '#334155',
          border: '1px solid rgba(100, 116, 139, 0.18)',
        };
    }
  }

  if (portalState === 'checking') {
    return (
      <main className={styles.page}>
        <div className={styles.loadingCard}>
          <div className={styles.loadingBadge}>Client Portal</div>
          <h1 className={styles.loadingTitle}>Loading your workspace...</h1>
          <p className={styles.loadingText}>
            {loadingStep}
          </p>
        </div>
      </main>
    );
  }

  if (portalState === 'blocked') {
    return (
      <main className={styles.page}>
        <div className={styles.loadingCard}>
          <div className={styles.loadingBadge}>Client Portal</div>
          <h1 className={styles.loadingTitle}>Portal access needs attention</h1>
          <p className={styles.loadingText}>
            {portalLoadError || historyMessage || 'Your session could not finish loading on this device.'}
          </p>
          <div className={styles.mobileRecoveryCard}>
            <div className={styles.mobileRecoveryTitle}>Try this on mobile Safari</div>
            <div className={styles.mobileRecoveryStep}>1. Open `/client/login` again and sign in fresh.</div>
            <div className={styles.mobileRecoveryStep}>2. Make sure Safari is not in Private Browsing mode.</div>
            <div className={styles.mobileRecoveryStep}>3. If it still fails, close the Safari tab and reopen the login page.</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageInner}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>AmeryMed Client Portal</div>
            <h1 className={styles.heroTitle}>{welcomeTitle}</h1>
            <p className={styles.heroText}>{welcomeText}</p>
          </div>

          <div className={styles.heroMeta}>
            <div className={styles.identityCard}>
              <div className={styles.identityLabel}>Signed in as</div>
              <div className={styles.identityValue}>{sessionEmail || 'Unknown user'}</div>
            </div>
            <div className={styles.identityCard}>
              <div className={styles.identityLabel}>Clinic</div>
              <div className={styles.identityValue}>{effectiveClinicName || clinicName || 'Not linked'}</div>
            </div>
            <div className={styles.identityCard}>
              <div className={styles.identityLabel}>Account Name</div>
              <div className={styles.identityValue}>
                {displayName || 'AmeryMed Client'}
              </div>
            </div>
            {(providerNpi || providerContactEmail) && (
              <div className={styles.identityCard}>
                <div className={styles.identityLabel}>Provider Details</div>
                <div className={styles.identityValue}>
                  {providerNpi ? `NPI: ${providerNpi}` : providerContactEmail}
                </div>
                {providerNpi && providerContactEmail && (
                  <div className={styles.identitySubvalue}>
                    {providerContactEmail}
                  </div>
                )}
              </div>
            )}
            {providerAddress && (
              <div className={styles.identityCard}>
                <div className={styles.identityLabel}>Office Address</div>
                <div className={styles.identityValue}>{providerAddress}</div>
              </div>
            )}
            <button onClick={handleLogout} className={styles.logoutButton}>
              Logout
            </button>
          </div>
        </section>

        <section className={styles.statsGrid}>
          {stats.map((stat) => (
            <article key={stat.label} className={styles.statCard}>
              <div className={styles.statLabel}>{stat.label}</div>
              <div className={styles.statValue}>{stat.value}</div>
            </article>
          ))}
        </section>

        <section className={`${styles.panel} ${styles.feedPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <div className={styles.panelEyebrow}>Industry Updates</div>
              <h2 className={styles.panelTitle}>Healthcare and billing updates for client offices</h2>
            </div>
            <div className={styles.subtlePill}>{industryUpdates.length} items</div>
          </div>

          <p className={styles.panelText}>
            Use this feed to keep physicians and office staff aware of billing, payer, compliance,
            and documentation trends without leaving the portal.
          </p>

          {industryUpdatesMessage && (
            <div className={styles.feedMessage}>{industryUpdatesMessage}</div>
          )}

          {industryUpdates.length === 0 ? (
            <div className={styles.emptyState}>
              No official feed items are visible yet. Once the trusted-source sync completes, updates
              will appear here automatically.
            </div>
          ) : (
            <div className={styles.feedGrid}>
              {industryUpdates.map((item) => (
                <article key={item.id} className={styles.feedCard}>
                  <div className={styles.feedCardTop}>
                    <span className={styles.feedTopic}>{item.topic || 'Industry update'}</span>
                    <span className={styles.feedLiveBadge}>Live feed</span>
                  </div>
                  <h3 className={styles.feedTitle}>{item.title}</h3>
                  <p className={styles.feedSummary}>
                    {item.summary || 'A new client-facing update is available in the portal feed.'}
                  </p>
                  <div className={styles.feedFooter}>
                    <div className={styles.feedMetaBlock}>
                      <span className={styles.feedSource}>{item.source_name || 'Trusted source'}</span>
                      <span className={styles.feedDate}>{formatFeedDate(item.published_at)}</span>
                    </div>
                    {item.source_url ? (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.feedLink}
                      >
                        Open source
                      </a>
                    ) : (
                      <span className={styles.feedLinkMuted}>Source unavailable</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.contentGrid}>
          <div className={styles.leftColumn}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <div className={styles.panelEyebrow}>Upload Center</div>
                  <h2 className={styles.panelTitle}>Send a new document</h2>
                </div>
                <div className={styles.tipPill}>Secure transfer</div>
              </div>

              <p className={styles.panelText}>
                Add the category, patient reference, and any notes that help the admin team
                process your file correctly the first time.
              </p>

              <form onSubmit={handleUpload}>
                <label className={styles.formLabel}>Clinic Name</label>
                <input
                  value={clinicName}
                  readOnly
                  className={`${styles.input} ${styles.readonlyInput}`}
                />

                <label className={styles.formLabel}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={styles.input}
                  disabled={!clientId || portalState !== 'ready'}
                >
                  <option value="EOB">EOB</option>
                  <option value="ERA">ERA</option>
                  <option value="FaceSheet">FaceSheet</option>
                  <option value="InsuranceCard">Insurance Card</option>
                  <option value="Claims">Claims</option>
                  <option value="Other">Other</option>
                </select>

                <label className={styles.formLabel}>Patient Reference</label>
                <input
                  value={patientReference}
                  onChange={(e) => setPatientReference(e.target.value)}
                  className={styles.input}
                  placeholder="Example: Jane Doe / DOS 04-11-2026"
                  disabled={!clientId || portalState !== 'ready'}
                />

                <label className={styles.formLabel}>Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${styles.input} ${styles.notesInput}`}
                  placeholder="Optional processing notes for the billing team"
                  disabled={!clientId || portalState !== 'ready'}
                />

                <label className={styles.formLabel}>Upload Document</label>
                <div className={styles.capturePanel}>
                  <div className={styles.captureHeader}>
                    <div className={styles.captureTitle}>Mobile quick capture</div>
                  <div className={styles.captureText}>
                      On iPhone or Android, use your camera to snap EOBs, face sheets, insurance
                      cards, and other billing paperwork directly from the portal.
                    </div>
                  </div>

                  <div className={styles.capturePresetRow}>
                    <button
                      type="button"
                      className={`${styles.capturePresetButton} ${
                        capturePreset === 'general' ? styles.capturePresetButtonActive : ''
                      }`}
                      disabled={!clientId || portalState !== 'ready'}
                      onClick={() => applyCapturePreset('general')}
                    >
                      General document
                    </button>
                    <button
                      type="button"
                      className={`${styles.capturePresetButton} ${
                        capturePreset === 'insurance-front' ? styles.capturePresetButtonActive : ''
                      }`}
                      disabled={!clientId || portalState !== 'ready'}
                      onClick={() => applyCapturePreset('insurance-front')}
                    >
                      Insurance front
                    </button>
                    <button
                      type="button"
                      className={`${styles.capturePresetButton} ${
                        capturePreset === 'insurance-back' ? styles.capturePresetButtonActive : ''
                      }`}
                      disabled={!clientId || portalState !== 'ready'}
                      onClick={() => applyCapturePreset('insurance-back')}
                    >
                      Insurance back
                    </button>
                    <button
                      type="button"
                      className={`${styles.capturePresetButton} ${
                        capturePreset === 'paper-packet' ? styles.capturePresetButtonActive : ''
                      }`}
                      disabled={!clientId || portalState !== 'ready'}
                      onClick={() => applyCapturePreset('paper-packet')}
                    >
                      Multi-page packet
                    </button>
                  </div>

                  <div className={styles.captureActions}>
                    <button
                      type="button"
                      className={styles.captureButton}
                      disabled={!clientId || portalState !== 'ready'}
                      onClick={() =>
                        (isNativeWrapper ? standardFileInputRef : mobileCameraInputRef).current?.click()
                      }
                    >
                      Add Photo
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      disabled={!clientId || portalState !== 'ready'}
                      onClick={() => standardFileInputRef.current?.click()}
                    >
                      Browse Files
                    </button>
                  </div>

                  <div className={styles.captureHint}>
                    {isNativeWrapper
                      ? 'Inside the app, Add Photo uses the safer iPhone photo picker flow. You can still add front/back cards, EOB packets, face sheets, and other images.'
                      : 'Each tap can add another page or image. This works well for front/back cards, EOB packets, face sheets, and other multi-page paperwork.'}
                  </div>

                  <div className={styles.captureChecklist}>
                    {captureChecklist.map((item) => (
                      <div key={item} className={styles.captureChecklistItem}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <input
                  ref={mobileCameraInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelection(e.target.files?.[0] || null)}
                  className={styles.hiddenFileInput}
                  disabled={!clientId || portalState !== 'ready'}
                />
                <input
                  ref={standardFileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  multiple
                  onChange={(e) => handleFileBatchSelection(e.target.files)}
                  className={styles.hiddenFileInput}
                  disabled={!clientId || portalState !== 'ready'}
                />

                <div className={styles.selectedFileCard}>
                  <div className={styles.selectedFileHeader}>
                    <div>
                      <div className={styles.selectedFileLabel}>Selected files</div>
                      <div className={styles.selectedFileValue}>
                        {selectedFiles.length === 0
                          ? 'No files chosen yet'
                          : `${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'} ready`}
                      </div>
                    </div>
                    {selectedFiles.length > 0 && (
                      <button
                        type="button"
                        className={styles.clearFilesButton}
                        onClick={clearSelectedFiles}
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className={styles.selectedFileList}>
                      {selectedFiles.map((item, index) => (
                        <div key={`${item.name}-${item.size}-${item.lastModified}`} className={styles.selectedFileItem}>
                          <div className={styles.selectedFileItemCopy}>
                            <div className={styles.selectedFileItemName}>{item.name}</div>
                            <div className={styles.selectedFileItemMeta}>
                              {item.type || 'Unknown type'} · {formatFileSize(item.size)}
                            </div>
                          </div>
                          <button
                            type="button"
                            className={styles.removeFileButton}
                            onClick={() => removeSelectedFile(index)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {previewInfo && (
                  <div className={styles.previewCard}>
                    <div className={styles.previewHeading}>Ready to upload</div>
                    <div className={styles.previewRow}>
                      <span className={styles.previewLabel}>File name</span>
                      <span className={styles.previewValue}>{previewInfo.name}</span>
                    </div>
                    <div className={styles.previewRow}>
                      <span className={styles.previewLabel}>Type</span>
                      <span className={styles.previewValue}>{previewInfo.type}</span>
                    </div>
                    <div className={styles.previewRow}>
                      <span className={styles.previewLabel}>Size</span>
                      <span className={styles.previewValue}>{previewInfo.size}</span>
                    </div>

                    {previewInfo.isImage && previewInfo.imageUrl && (
                      <Image
                        src={previewInfo.imageUrl}
                        alt="Upload preview"
                        width={260}
                        height={220}
                        unoptimized
                        className={styles.previewImage}
                      />
                    )}
                  </div>
                )}

                {duplicateMatches.length > 0 && (
                  <div className={styles.warningCard}>
                    <div className={styles.warningTitle}>Possible duplicate detected</div>
                    <div className={styles.warningText}>
                      Similar uploads already exist for this clinic. You can still continue if
                      this is a new version or a corrected document.
                    </div>
                    <div className={styles.warningList}>
                      {duplicateMatches.slice(0, 3).map((item) => (
                        <div key={item.id} className={styles.warningItem}>
                          <strong>{item.file_name}</strong>
                          <span>{item.category || 'N/A'}</span>
                          <span>{item.patient_reference || 'No patient reference'}</span>
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isUploading || !clientId || portalState !== 'ready'}
                  className={`${styles.primaryButton} ${
                    isUploading || !clientId || portalState !== 'ready'
                      ? styles.buttonDisabled
                      : styles.buttonReady
                  }`}
                >
                  {isUploading ? 'Uploading document...' : 'Upload Document'}
                </button>

                {message && (
                  <div
                    className={
                      messageType === 'success' ? styles.successMessage : styles.errorMessage
                    }
                  >
                    {message}
                  </div>
                )}
              </form>
            </article>

            <article className={`${styles.panel} ${styles.infoPanel}`}>
              <div className={styles.panelEyebrow}>Best Practices</div>
              <h2 className={styles.panelTitle}>What helps your team move faster</h2>
              <div className={styles.tipsGrid}>
                <div className={styles.tipCard}>
                  <div className={styles.tipTitle}>Use a clear patient reference</div>
                  <p className={styles.tipBody}>
                    Include a patient name, account number, or date of service to reduce follow-up.
                  </p>
                </div>
                <div className={styles.tipCard}>
                  <div className={styles.tipTitle}>Choose the closest category</div>
                  <p className={styles.tipBody}>
                    Even an approximate category like EOB or Claims helps the admin team route it.
                  </p>
                </div>
                <div className={styles.tipCard}>
                  <div className={styles.tipTitle}>Check for duplicates first</div>
                  <p className={styles.tipBody}>
                    The history panel makes it easy to avoid re-sending files that are already in review.
                  </p>
                </div>
              </div>
            </article>

            <ClientPortalChat clientId={clientId} sessionEmail={sessionEmail} />
          </div>

          <article className={`${styles.panel} ${styles.historyPanel}`}>
            <div className={styles.panelHeader}>
              <div>
                <div className={styles.panelEyebrow}>History</div>
                <h2 className={styles.panelTitle}>Recent uploads</h2>
              </div>
              <div className={styles.subtlePill}>{history.length} items</div>
            </div>

            {historyMessage ? (
              <div className={styles.emptyState}>{historyMessage}</div>
            ) : history.length === 0 ? (
              <div className={styles.emptyState}>
                No uploads yet. Your submitted files will appear here once you send them.
              </div>
            ) : (
              <div className={styles.historyList}>
                {history.map((item) => (
                  <div key={item.id} className={styles.historyCard}>
                    <div className={styles.historyCardTop}>
                      <div>
                        <div className={styles.historyFile}>{item.file_name}</div>
                        <div className={styles.historyDate}>{formatDate(item.created_at)}</div>
                      </div>
                      <span
                        className={styles.statusPill}
                        style={getStatusStyle(item.status)}
                      >
                        {(item.status || 'unknown').replace('_', ' ')}
                      </span>
                    </div>

                    <div className={styles.historyMetaGrid}>
                      <div>
                        <div className={styles.historyMetaLabel}>Category</div>
                        <div className={styles.historyMetaValue}>{item.category || 'N/A'}</div>
                      </div>
                      <div>
                        <div className={styles.historyMetaLabel}>Patient Ref</div>
                        <div className={styles.historyMetaValue}>
                          {item.patient_reference || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className={styles.historyMetaLabel}>File size</div>
                        <div className={styles.historyMetaValue}>
                          {formatFileSize(item.file_size)}
                        </div>
                      </div>
                      <div>
                        <div className={styles.historyMetaLabel}>File type</div>
                        <div className={styles.historyMetaValue}>{item.file_type || 'N/A'}</div>
                      </div>
                    </div>

                    <div className={styles.notesBlock}>
                      <div className={styles.historyMetaLabel}>Notes</div>
                      <div className={styles.historyMetaValue}>
                        {item.notes || 'No notes provided.'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
