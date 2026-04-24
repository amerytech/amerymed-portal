'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import styles from '@/components/admin-dashboard.module.css';
import fileStyles from '@/components/admin-files.module.css';

type UploadRow = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  status: string | null;
  created_at: string;
  clinic_name: string | null;
  category: string | null;
  notes: string | null;
  patient_reference: string | null;
};

const STATUS_OPTIONS = ['received', 'in_review', 'processed'];

function formatFileSize(bytes: number | null) {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

export default function AdminFiles() {
  const supabase = createBrowserSupabaseClient();

  const [files, setFiles] = useState<UploadRow[]>([]);
  const [message, setMessage] = useState('Loading uploads...');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UploadRow | null>(null);
  const [downloadError, setDownloadError] = useState<{
    fileName: string;
    filePath: string;
  } | null>(null);

  const [previewFile, setPreviewFile] = useState<{
    fileName: string;
    fileType: string;
    objectUrl: string;
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const [availabilityMap, setAvailabilityMap] = useState<
    Record<string, 'checking' | 'available' | 'missing'>
  >({});

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesValue, setEditingNotesValue] = useState('');
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    const { data, error } = await supabase
      .from('uploads')
      .select(
        'id, file_name, file_path, file_size, file_type, status, created_at, clinic_name, category, notes, patient_reference'
      )
      .order('created_at', { ascending: false });

    if (error) {
      setMessage('Failed to load uploads: ' + error.message);
      return;
    }

    setFiles(data || []);
    setMessage('');
    setSelectedIds([]);
  }, [supabase]);

  async function writeAuditLog(
    action: string,
    file: { id?: string; file_name?: string },
    details: string
  ) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from('audit_logs').insert({
        user_id: user?.id || null,
        user_email: user?.email || null,
        action,
        upload_id: file.id || null,
        file_name: file.file_name || null,
        details,
      });
    } catch (error) {
      console.error('Audit log failed:', error);
    }
  }

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => {
      void loadFiles();
    }, 0);

    const channel = supabase
      .channel('admin-uploads')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'uploads',
        },
        () => {
          void loadFiles();
        }
      )
      .subscribe();

    return () => {
      window.clearTimeout(initialLoadId);
      void supabase.removeChannel(channel);
    };
  }, [loadFiles, supabase]);

  useEffect(() => {
    void (async () => {
      if (files.length > 0) {
        const initialMap: Record<string, 'checking' | 'available' | 'missing'> = {};
        files.forEach((row) => {
          initialMap[row.id] = 'checking';
        });
        setAvailabilityMap(initialMap);

        const results = await Promise.all(
          files.map(async (row) => {
            const cleanPath = (row.file_path || '').trim().replace(/^\/+/, '');

            if (!cleanPath) {
              return { id: row.id, status: 'missing' as const };
            }

            const { data } = supabase.storage.from('client-documents').getPublicUrl(cleanPath);
            const publicUrl = data?.publicUrl;

            if (!publicUrl) {
              return { id: row.id, status: 'missing' as const };
            }

            try {
              const res = await fetch(publicUrl, { method: 'HEAD' });
              return {
                id: row.id,
                status: res.ok ? ('available' as const) : ('missing' as const),
              };
            } catch {
              return { id: row.id, status: 'missing' as const };
            }
          })
        );

        const finalMap: Record<string, 'checking' | 'available' | 'missing'> = {};
        results.forEach((item) => {
          finalMap[item.id] = item.status;
        });
        setAvailabilityMap(finalMap);
      } else {
        setAvailabilityMap({});
      }
    })();
  }, [files, supabase]);

  const stats = useMemo(() => {
    const total = files.length;
    const received = files.filter((f) => f.status === 'received').length;
    const inReview = files.filter((f) => f.status === 'in_review').length;
    const processed = files.filter((f) => f.status === 'processed').length;

    return { total, received, inReview, processed };
  }, [files]);

  const categoryOptions = useMemo(() => {
    const values = Array.from(new Set(files.map((f) => f.category).filter(Boolean))) as string[];
    return values.sort((a, b) => a.localeCompare(b));
  }, [files]);

  function matchesDateFilter(createdAt: string, filter: string) {
    if (filter === 'all') return true;

    const itemDate = new Date(createdAt);
    const now = new Date();

    if (filter === 'today') {
      return itemDate.toDateString() === now.toDateString();
    }

    if (filter === 'last7') {
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - 7);
      return itemDate >= cutoff;
    }

    if (filter === 'last30') {
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - 30);
      return itemDate >= cutoff;
    }

    return true;
  }

  const filteredFiles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return files.filter((file) => {
      const matchesSearch =
        !q ||
        file.file_name?.toLowerCase().includes(q) ||
        file.clinic_name?.toLowerCase().includes(q) ||
        file.patient_reference?.toLowerCase().includes(q) ||
        file.notes?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || (file.status || '') === statusFilter;
      const matchesCategory =
        categoryFilter === 'all' || (file.category || '') === categoryFilter;
      const matchesDate = matchesDateFilter(file.created_at, dateFilter);

      return matchesSearch && matchesStatus && matchesCategory && matchesDate;
    });
  }, [files, searchTerm, statusFilter, categoryFilter, dateFilter]);

  const allFilteredSelected =
    filteredFiles.length > 0 && filteredFiles.every((file) => selectedIds.includes(file.id));

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredFiles.map((f) => f.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...filteredFiles.map((f) => f.id)]);
      setSelectedIds(Array.from(merged));
    }
  }

  function exportToCsv() {
    if (filteredFiles.length === 0) {
      alert('No filtered uploads to export.');
      return;
    }

    const headers = [
      'File Name',
      'Clinic',
      'Category',
      'Patient Reference',
      'Status',
      'Storage Availability',
      'File Type',
      'File Size',
      'Uploaded At',
      'Notes',
      'Path',
    ];

    const escapeCsv = (value: unknown) => {
      const str = String(value ?? '');
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredFiles.map((file) => [
      file.file_name,
      file.clinic_name || '',
      file.category || '',
      file.patient_reference || '',
      file.status || '',
      availabilityMap[file.id] || '',
      file.file_type || '',
      file.file_size ?? '',
      formatTimestamp(file.created_at),
      file.notes || '',
      file.file_path || '',
    ]);

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map((row) => row.map(escapeCsv).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const a = document.createElement('a');
    a.href = url;
    a.download = `amerymed_uploads_${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function fetchFileBlob(filePath: string) {
    const cleanPath = filePath.trim().replace(/^\/+/, '');
    const { data, error } = await supabase.storage.from('client-documents').download(cleanPath);

    if (error || !data) {
      return { data: null, error, cleanPath };
    }

    return { data, error: null, cleanPath };
  }

  async function handleDownload(filePath: string, fileName: string) {
    if (!filePath) {
      setDownloadError({
        fileName,
        filePath: 'Missing file path',
      });
      return;
    }

    const result = await fetchFileBlob(filePath);

    if (!result.data) {
      setDownloadError({
        fileName,
        filePath: result.cleanPath,
      });
      return;
    }

    const url = URL.createObjectURL(result.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handlePreview(file: UploadRow) {
    if (!file.file_path) {
      setDownloadError({
        fileName: file.file_name,
        filePath: 'Missing file path',
      });
      return;
    }

    const result = await fetchFileBlob(file.file_path);

    if (!result.data) {
      setDownloadError({
        fileName: file.file_name,
        filePath: result.cleanPath,
      });
      return;
    }

    const objectUrl = URL.createObjectURL(result.data);
    setPreviewFile({
      fileName: file.file_name,
      fileType: file.file_type || '',
      objectUrl,
    });
  }

  function closePreview() {
    if (previewFile?.objectUrl) {
      URL.revokeObjectURL(previewFile.objectUrl);
    }
    setPreviewFile(null);
  }

  async function handleStatusChange(uploadId: string, newStatus: string) {
    setSavingId(uploadId);

    const { error } = await supabase.from('uploads').update({ status: newStatus }).eq('id', uploadId);

    if (error) {
      alert('Status update failed: ' + error.message);
      setSavingId(null);
      return;
    }

    setFiles((prev) => prev.map((file) => (file.id === uploadId ? { ...file, status: newStatus } : file)));

    const changedFile = files.find((file) => file.id === uploadId);
    await writeAuditLog(
      'STATUS_UPDATE',
      changedFile || { id: uploadId, file_name: '' },
      `Status changed to ${newStatus}`
    );

    setSavingId(null);
  }

  async function handleDelete(file: UploadRow) {
    setDeletingId(file.id);

    const cleanPath = (file.file_path || '').trim().replace(/^\/+/, '');

    if (cleanPath) {
      const { error: storageError } = await supabase.storage
        .from('client-documents')
        .remove([cleanPath]);

      if (storageError && storageError.message !== 'Object not found') {
        alert('Storage delete failed: ' + storageError.message);
        setDeletingId(null);
        return;
      }
    }

    const { error: dbError } = await supabase.from('uploads').delete().eq('id', file.id);

    if (dbError) {
      alert('Database delete failed: ' + dbError.message);
      setDeletingId(null);
      return;
    }

    await writeAuditLog(
      'DELETE',
      file,
      `Deleted upload and storage object: ${file.file_path || 'no path'}`
    );

    setFiles((prev) => prev.filter((item) => item.id !== file.id));
    setSelectedIds((prev) => prev.filter((id) => id !== file.id));
    setDeletingId(null);
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) {
      alert('No uploads selected.');
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected upload(s)?\n\nThis will remove files from storage and records from the database.`
    );

    if (!confirmed) return;

    for (const id of selectedIds) {
      const file = files.find((f) => f.id === id);
      if (file) {
        await handleDelete(file);
      }
    }
  }

  function startEditNotes(file: UploadRow) {
    setEditingNotesId(file.id);
    setEditingNotesValue(file.notes || '');
  }

  function cancelEditNotes() {
    setEditingNotesId(null);
    setEditingNotesValue('');
  }

  async function saveNotes(fileId: string) {
    setSavingNotesId(fileId);

    const { error } = await supabase.from('uploads').update({ notes: editingNotesValue }).eq('id', fileId);

    if (error) {
      alert('Notes update failed: ' + error.message);
      setSavingNotesId(null);
      return;
    }

    setFiles((prev) =>
      prev.map((file) => (file.id === fileId ? { ...file, notes: editingNotesValue } : file))
    );

    const editedFile = files.find((file) => file.id === fileId);
    await writeAuditLog(
      'NOTES_UPDATE',
      editedFile || { id: fileId, file_name: '' },
      `Notes updated to: ${editingNotesValue}`
    );

    setSavingNotesId(null);
    setEditingNotesId(null);
    setEditingNotesValue('');
  }

  function getStatusBadgeStyle(status: string | null): React.CSSProperties {
    switch (status) {
      case 'received':
        return {
          background: '#e8f1ff',
          color: '#1d4ed8',
          border: '1px solid #bfdbfe',
        };
      case 'in_review':
        return {
          background: '#fff7e6',
          color: '#b45309',
          border: '1px solid #fcd34d',
        };
      case 'processed':
        return {
          background: '#e8f7ed',
          color: '#15803d',
          border: '1px solid #bbf7d0',
        };
      default:
        return {
          background: '#f3f4f6',
          color: '#374151',
          border: '1px solid #d1d5db',
        };
    }
  }

  function getAvailabilityBadgeStyle(
    availability: 'checking' | 'available' | 'missing' | undefined
  ): React.CSSProperties {
    switch (availability) {
      case 'available':
        return {
          background: '#e8f7ed',
          color: '#15803d',
          border: '1px solid #bbf7d0',
        };
      case 'missing':
        return {
          background: '#fdecec',
          color: '#b42318',
          border: '1px solid #f5c2c7',
        };
      default:
        return {
          background: '#f3f4f6',
          color: '#6b7280',
          border: '1px solid #d1d5db',
        };
    }
  }

  function getAvailabilityLabel(
    availability: 'checking' | 'available' | 'missing' | undefined
  ) {
    switch (availability) {
      case 'available':
        return 'Available in Storage';
      case 'missing':
        return 'Missing from Storage';
      default:
        return 'Checking...';
    }
  }

  function canPreview(fileType: string | null) {
    if (!fileType) return false;
    return fileType.startsWith('image/') || fileType === 'application/pdf';
  }

  if (message) {
    return (
      <section className={styles.panel}>
        <div className={styles.emptyState}>{message}</div>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <div className={styles.panelEyebrow}>Intake Control</div>
          <h2 className={styles.panelTitle}>Upload operations</h2>
          <p className={styles.panelSubtitle}>
            Review uploaded documents, update processing status, edit notes, confirm
            storage health, and export the current filtered view.
          </p>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total uploads</div>
          <div className={styles.summaryValue}>{stats.total}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Received</div>
          <div style={{ ...summaryValueToneStyle, color: '#1d4ed8' }}>{stats.received}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>In review</div>
          <div style={{ ...summaryValueToneStyle, color: '#b45309' }}>{stats.inReview}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Processed</div>
          <div style={{ ...summaryValueToneStyle, color: '#15803d' }}>{stats.processed}</div>
        </div>
      </div>

      <div className={fileStyles.filtersPanel}>
        <div className={fileStyles.filtersGrid}>
          <div>
            <label className={fileStyles.label}>Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search file, clinic, patient ref, notes"
              className={fileStyles.filterInput}
            />
          </div>

          <div>
            <label className={fileStyles.label}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={fileStyles.filterInput}
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={fileStyles.label}>Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={fileStyles.filterInput}
            >
              <option value="all">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={fileStyles.label}>Date Range</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={fileStyles.filterInput}
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="last7">Last 7 days</option>
              <option value="last30">Last 30 days</option>
            </select>
          </div>
        </div>

        <div className={fileStyles.toolbarRow}>
          <div className={fileStyles.toolbarText}>
            Showing <strong>{filteredFiles.length}</strong> of <strong>{files.length}</strong>{' '}
            uploads
          </div>

          <div className={fileStyles.toolbarButtonRow}>
            <button
              onClick={toggleSelectAllFiltered}
              className={`${fileStyles.buttonBase} ${fileStyles.buttonSecondary}`}
            >
              {allFilteredSelected ? 'Unselect All' : 'Select All Visible'}
            </button>
            <button
              onClick={handleBulkDelete}
              className={`${fileStyles.buttonBase} ${fileStyles.buttonDanger}`}
            >
              Bulk Delete ({selectedIds.length})
            </button>
            <button
              onClick={exportToCsv}
              className={`${fileStyles.buttonBase} ${fileStyles.buttonAccent}`}
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {filteredFiles.length === 0 ? (
        <div className={styles.emptyState}>No uploads match your current filters.</div>
      ) : (
        <div className={fileStyles.cardList}>
          {filteredFiles.map((file) => (
            <article
              key={file.id}
              className={`${fileStyles.fileCard} ${
                selectedIds.includes(file.id)
                  ? fileStyles.fileCardSelected
                  : fileStyles.fileCardDefault
              }`}
            >
              <div className={fileStyles.fileHeader}>
                <div>
                  <h3 className={fileStyles.fileTitle}>{file.file_name}</h3>
                  <div className={fileStyles.pillRow}>
                    <span
                      style={{
                        ...pillBaseStyle,
                        ...getStatusBadgeStyle(file.status),
                        textTransform: 'capitalize',
                      }}
                    >
                      {(file.status || 'unknown').replace('_', ' ')}
                    </span>
                    <span
                      style={{
                        ...pillBaseStyle,
                        ...getAvailabilityBadgeStyle(availabilityMap[file.id]),
                      }}
                    >
                      {getAvailabilityLabel(availabilityMap[file.id])}
                    </span>
                  </div>
                </div>

                <label className={fileStyles.selectLabel}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(file.id)}
                    onChange={() => toggleSelectOne(file.id)}
                  />
                  Select
                </label>
              </div>

              <div className={fileStyles.metaGrid}>
                <div>
                  <div className={fileStyles.metaLabel}>Clinic</div>
                  <div className={fileStyles.metaValue}>{file.clinic_name || 'N/A'}</div>
                </div>
                <div>
                  <div className={fileStyles.metaLabel}>Category</div>
                  <div className={fileStyles.metaValue}>{file.category || 'N/A'}</div>
                </div>
                <div>
                  <div className={fileStyles.metaLabel}>Patient Ref</div>
                  <div className={fileStyles.metaValue}>{file.patient_reference || 'N/A'}</div>
                </div>
                <div>
                  <div className={fileStyles.metaLabel}>Size</div>
                  <div className={fileStyles.metaValue}>{formatFileSize(file.file_size)}</div>
                </div>
                <div>
                  <div className={fileStyles.metaLabel}>Type</div>
                  <div className={fileStyles.metaValue}>{file.file_type || 'N/A'}</div>
                </div>
                <div>
                  <div className={fileStyles.metaLabel}>Uploaded</div>
                  <div className={fileStyles.metaValue}>{formatTimestamp(file.created_at)}</div>
                </div>
              </div>

              <div className={fileStyles.notesPanel}>
                <div className={fileStyles.metaLabel}>Notes</div>
                {editingNotesId === file.id ? (
                  <div style={{ marginTop: '8px' }}>
                    <textarea
                      value={editingNotesValue}
                      onChange={(e) => setEditingNotesValue(e.target.value)}
                      className={fileStyles.notesTextarea}
                    />
                    <div className={fileStyles.inlineButtonRow}>
                      <button
                        onClick={() => saveNotes(file.id)}
                        disabled={savingNotesId === file.id}
                        className={`${fileStyles.buttonBase} ${fileStyles.buttonSuccess}`}
                      >
                        {savingNotesId === file.id ? 'Saving...' : 'Save Notes'}
                      </button>
                      <button
                        onClick={cancelEditNotes}
                        className={`${fileStyles.buttonBase} ${fileStyles.buttonNeutral}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: '6px' }}>
                    <p className={fileStyles.notesText}>{file.notes || 'No notes recorded.'}</p>
                    <button
                      onClick={() => startEditNotes(file)}
                      className={`${fileStyles.buttonBase} ${fileStyles.buttonSecondary}`}
                    >
                      Edit Notes
                    </button>
                  </div>
                )}
              </div>

              <div className={fileStyles.pathPanel}>
                <div className={fileStyles.metaLabel}>Storage path</div>
                <div className={fileStyles.pathValue}>{file.file_path || 'N/A'}</div>
              </div>

              <div className={fileStyles.statusBlock}>
                <label className={fileStyles.label}>Update Status</label>
                <select
                  value={file.status || 'received'}
                  onChange={(e) => handleStatusChange(file.id, e.target.value)}
                  disabled={savingId === file.id || deletingId === file.id}
                  className={fileStyles.statusSelect}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>

                {savingId === file.id && (
                  <p className={fileStyles.statusSaving}>Saving status...</p>
                )}
              </div>

              <div className={fileStyles.actionRow}>
                {canPreview(file.file_type) && (
                  <button
                    onClick={() => handlePreview(file)}
                    disabled={deletingId === file.id}
                    className={`${fileStyles.buttonBase} ${fileStyles.buttonSecondary}`}
                  >
                    Preview
                  </button>
                )}

                <button
                  onClick={() => handleDownload(file.file_path, file.file_name)}
                  disabled={deletingId === file.id}
                  className={`${fileStyles.buttonBase} ${fileStyles.buttonPrimary}`}
                >
                  Download
                </button>

                <button
                  onClick={() => setConfirmDelete(file)}
                  disabled={deletingId === file.id}
                  style={{
                    ...dangerButtonStyle,
                    background: deletingId === file.id ? '#fca5a5' : '#dc2626',
                    cursor: deletingId === file.id ? 'not-allowed' : 'pointer',
                  }}
                >
                  {deletingId === file.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {previewFile && (
        <div className={fileStyles.overlay}>
          <div className={fileStyles.previewModal}>
            <div className={fileStyles.previewHeader}>
              <strong className={fileStyles.previewTitle}>{previewFile.fileName}</strong>
              <button
                onClick={closePreview}
                className={`${fileStyles.buttonBase} ${fileStyles.buttonDanger}`}
              >
                Close
              </button>
            </div>

            <div className={fileStyles.previewSurface}>
              {previewFile.fileType.startsWith('image/') ? (
                <div className={fileStyles.previewBody}>
                  <Image
                    src={previewFile.objectUrl}
                    alt={previewFile.fileName}
                    width={1200}
                    height={900}
                    unoptimized
                    className={fileStyles.previewImage}
                  />
                </div>
              ) : previewFile.fileType === 'application/pdf' ? (
                <iframe
                  src={previewFile.objectUrl}
                  title={previewFile.fileName}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                />
              ) : (
                <div style={{ padding: '20px' }}>Preview is not available for this file type.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className={fileStyles.overlay}>
          <div className={fileStyles.dialog}>
            <h3 className={fileStyles.dialogTitle}>Confirm Delete</h3>
            <p className={fileStyles.dialogBody}>
              Are you sure you want to delete:
              <br />
              <strong>{confirmDelete.file_name}</strong> ?
            </p>
            <div className={fileStyles.dialogButtonRow}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ ...neutralButtonStyle, flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleDelete(confirmDelete);
                  setConfirmDelete(null);
                }}
                style={{ ...dangerButtonStyle, flex: 1 }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {downloadError && (
        <div className={fileStyles.overlay}>
          <div className={fileStyles.dialog}>
            <h3 className={fileStyles.dialogTitleDanger}>File Missing</h3>
            <p className={fileStyles.dialogBody}>
              This upload record exists in the database, but the file is missing in storage.
            </p>
            <p>
              <strong>File:</strong> {downloadError.fileName}
            </p>
            <p style={{ wordBreak: 'break-all' }}>
              <strong>Path:</strong> {downloadError.filePath}
            </p>
            <p style={{ marginTop: '10px', color: '#555' }}>
              You can delete this stale record safely.
            </p>
            <div className={fileStyles.dialogButtonRow}>
              <button
                onClick={() => setDownloadError(null)}
                style={{ ...neutralButtonStyle, flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const fileToDelete = files.find((f) => f.file_path === downloadError.filePath);
                  if (fileToDelete) {
                    await handleDelete(fileToDelete);
                  }
                  setDownloadError(null);
                }}
                style={{ ...dangerButtonStyle, flex: 1 }}
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const summaryValueToneStyle: React.CSSProperties = {
  fontSize: '26px',
  fontWeight: 800,
};

const pillBaseStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '6px 10px',
  borderRadius: '999px',
  fontSize: '13px',
  fontWeight: 700,
};

const buttonBaseStyle: React.CSSProperties = {
  border: 'none',
  padding: '10px 14px',
  borderRadius: '10px',
  fontWeight: 700,
};

const dangerButtonStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  background: '#dc2626',
  color: '#fff',
};

const neutralButtonStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  background: '#f3f4f6',
  color: '#111827',
  border: '1px solid #cbd5e1',
};
