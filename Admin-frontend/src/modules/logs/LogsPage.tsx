import React, { useEffect, useState } from 'react';
import { logsApi } from '../../services/api';
import { ShieldCheck, RefreshCw } from 'lucide-react';

interface Log {
  id: string;
  action: string;
  performedBy: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const actionColors: Record<string, string> = {
  LOGIN: 'bg-blue-50 text-blue-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
  CREATE_OWNER: 'bg-green-50 text-green-700',
  RESET_PASSWORD: 'bg-amber-50 text-amber-700',
  UPDATE_SUBSCRIPTION: 'bg-purple-50 text-purple-700',
  CLOSE_TICKET: 'bg-red-50 text-red-700',
  VIEW_LOGS: 'bg-gray-50 text-gray-600',
  CREATE_TENANT: 'bg-green-50 text-green-700',
  UPDATE_TENANT: 'bg-amber-50 text-amber-700',
};

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = async () => {
    setIsLoading(true);
    try {
      const res = await logsApi.getAll(200);
      setLogs(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Logs & Security</h1>
          <p className="page-subtitle">Audit trail of all administrative actions</p>
        </div>
        <button onClick={fetch} className="btn-secondary gap-1.5 text-xs">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border)]">
          <ShieldCheck size={15} className="text-[var(--color-text-muted)]" />
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">Activity Timeline</span>
          <span className="ml-auto text-xs text-[var(--color-text-muted)]">{logs.length} entries</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-5 w-5 text-[var(--color-text-muted)]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-[var(--color-surface-raised)] transition-colors">
                <div className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${actionColors[log.action] || 'bg-gray-100 text-gray-600'}`}>
                  {log.action.replace(/_/g, ' ')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--color-text-primary)]">{log.details || log.action}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">by <strong>{log.performedBy}</strong>
                    {log.ipAddress && <> · {log.ipAddress}</>}
                  </p>
                </div>
                <span className="text-xs text-[var(--color-text-muted)] shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">No audit logs found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsPage;
