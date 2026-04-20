'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import styles from '@/components/admin-dashboard.module.css';

type AuditLogRow = {
  id: string;
  user_email: string | null;
  action: string;
  upload_id: string | null;
  file_name: string | null;
  details: string | null;
  created_at: string;
};

function formatActionLabel(action: string) {
  return action.replaceAll('_', ' ').toLowerCase();
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function getActionTone(action: string): React.CSSProperties {
  if (action.includes('DELETE')) {
    return {
      background: '#fff1f2',
      color: '#b42318',
      border: '1px solid #fecdd3',
    };
  }

  if (action.includes('STATUS')) {
    return {
      background: '#eef4ff',
      color: '#123c7a',
      border: '1px solid #c7d8f8',
    };
  }

  if (action.includes('NOTES')) {
    return {
      background: '#fff8ea',
      color: '#9a5b00',
      border: '1px solid #f6cf74',
    };
  }

  return {
    background: '#eef8f4',
    color: '#0f766e',
    border: '1px solid #bde7d7',
  };
}

export default function AdminAuditLog() {
  const supabase = createBrowserSupabaseClient();

  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(20);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) {
        setLoadError(error.message);
        setLogs([]);
        setLoading(false);
        return;
      }

      setLoadError('');
      setLogs(data || []);
      setLoading(false);
    })();
  }, [limit, refreshKey, supabase]);

  const summary = useMemo(() => {
    const deleteCount = logs.filter((log) => log.action.includes('DELETE')).length;
    const statusCount = logs.filter((log) => log.action.includes('STATUS')).length;
    const noteCount = logs.filter((log) => log.action.includes('NOTES')).length;

    return [
      { label: 'Loaded events', value: String(logs.length) },
      { label: 'Status changes', value: String(statusCount) },
      { label: 'Notes edits', value: String(noteCount) },
      { label: 'Deletes', value: String(deleteCount) },
    ];
  }, [logs]);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <div className={styles.panelEyebrow}>Audit Trail</div>
          <h2 className={styles.panelTitle}>Recent admin activity</h2>
          <p className={styles.panelSubtitle}>
            Track the latest status changes, note edits, and record deletions in one place.
          </p>
        </div>

        <button onClick={() => setRefreshKey((prev) => prev + 1)} className={styles.ghostButton}>
          Refresh
        </button>
      </div>

      <div className={styles.summaryGrid}>
        {summary.map((item) => (
          <div key={item.label} className={styles.summaryCard}>
            <div className={styles.summaryLabel}>{item.label}</div>
            <div className={styles.summaryValue}>{item.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className={styles.emptyState}>Loading audit logs...</div>
      ) : loadError ? (
        <div className={styles.errorState}>Failed to load audit logs: {loadError}</div>
      ) : logs.length === 0 ? (
        <div className={styles.emptyState}>No audit activity has been recorded yet.</div>
      ) : (
        <div style={listStyle}>
          {logs.map((log) => (
            <article key={log.id} style={logCardStyle}>
              <div style={logCardTopStyle}>
                <div>
                  <div style={fileNameStyle}>{log.file_name || 'General admin activity'}</div>
                  <div style={timestampStyle}>{formatTimestamp(log.created_at)}</div>
                </div>
                <span style={{ ...actionPillStyle, ...getActionTone(log.action) }}>
                  {formatActionLabel(log.action)}
                </span>
              </div>

              <div style={metaGridStyle}>
                <div>
                  <div style={metaLabelStyle}>User</div>
                  <div style={metaValueStyle}>{log.user_email || 'Unknown user'}</div>
                </div>
                <div>
                  <div style={metaLabelStyle}>Upload ID</div>
                  <div style={metaValueStyle}>{log.upload_id || 'N/A'}</div>
                </div>
              </div>

              <div style={detailsBlockStyle}>
                <div style={metaLabelStyle}>Details</div>
                <div style={metaValueStyle}>{log.details || 'No extra details recorded.'}</div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && logs.length >= limit && (
        <div style={footerRowStyle}>
          <button onClick={() => setLimit((prev) => prev + 20)} className={styles.primaryButton}>
            Load 20 More Events
          </button>
        </div>
      )}
    </section>
  );
}

const listStyle: React.CSSProperties = {
  display: 'grid',
  gap: '16px',
};

const logCardStyle: React.CSSProperties = {
  borderRadius: '20px',
  border: '1px solid #dce8f4',
  background: '#fbfdff',
  padding: '18px',
};

const logCardTopStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '12px',
  marginBottom: '14px',
  flexWrap: 'wrap',
};

const fileNameStyle: React.CSSProperties = {
  color: '#102848',
  fontWeight: 800,
  fontSize: '17px',
  lineHeight: 1.35,
};

const timestampStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '13px',
  marginTop: '4px',
};

const actionPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '7px 11px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 800,
  textTransform: 'capitalize',
  whiteSpace: 'nowrap',
};

const metaGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '14px 16px',
};

const metaLabelStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '4px',
};

const metaValueStyle: React.CSSProperties = {
  color: '#243447',
  lineHeight: 1.55,
  wordBreak: 'break-word',
};

const detailsBlockStyle: React.CSSProperties = {
  marginTop: '14px',
  paddingTop: '14px',
  borderTop: '1px solid #e8eff6',
};

const footerRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  marginTop: '20px',
};
