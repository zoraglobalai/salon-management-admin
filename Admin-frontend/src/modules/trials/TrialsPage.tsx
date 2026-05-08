import React, { useEffect, useState } from 'react';
import { FlaskConical, RefreshCw, Save } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import { trialsApi } from '../../services/api';

type TrialStatus = 'ACTIVE' | 'EXPIRED' | 'CONVERTED';

interface Trial {
  id: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  status: TrialStatus;
  tenant: { name: string; email: string; businessName: string };
}

interface TrialSettings {
  trialPeriodDays: number;
  defaultDays: number;
  minDays: number;
  maxDays: number;
}

const TrialsPage: React.FC = () => {
  const [data, setData] = useState<Trial[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<TrialSettings | null>(null);
  const [trialPeriodInput, setTrialPeriodInput] = useState('7');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [listRes, statsRes, settingsRes] = await Promise.all([
        trialsApi.getAll(statusFilter || undefined),
        trialsApi.getStats(),
        trialsApi.getSettings(),
      ]);
      setData(listRes.data.data);
      setStats(statsRes.data.data);
      setSettings(settingsRes.data.data);
      setTrialPeriodInput(String(settingsRes.data.data.trialPeriodDays));
    } catch (err) {
      console.error(err);
      setError('Unable to load trial settings right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetch();
  }, [statusFilter]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const parsedValue = Number.parseInt(trialPeriodInput, 10);
      const response = await trialsApi.updateSettings(parsedValue);
      setSettings(response.data.data);
      setTrialPeriodInput(String(response.data.data.trialPeriodDays));
      setSuccess('Trial period updated for all active and future owner trials.');
      await fetch();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to update trial period.');
    } finally {
      setIsSaving(false);
    }
  };

  const getDaysLeftLabel = (row: Trial) => {
    const diff = Math.ceil((new Date(row.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) {
      return 'Expired';
    }

    return `${diff} days`;
  };

  const getDaysLeftClass = (row: Trial) => {
    const diff = Math.ceil((new Date(row.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (row.status === 'CONVERTED') return diff > 0 ? 'text-emerald-600' : 'text-slate-500';
    if (row.status === 'EXPIRED') return 'text-red-600';
    if (diff > 3) return 'text-emerald-600';
    if (diff > 0) return 'text-amber-600';
    return 'text-red-600';
  };

  const columns = [
    {
      key: 'tenant',
      header: 'Business',
      render: (row: Trial) => (
        <div>
          <p className="font-medium">{row.tenant?.businessName}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{row.tenant?.email}</p>
        </div>
      ),
    },
    {
      key: 'startDate',
      header: 'Start Date',
      render: (row: Trial) => new Date(row.startDate).toLocaleDateString(),
    },
    {
      key: 'endDate',
      header: 'End Date',
      render: (row: Trial) => new Date(row.endDate).toLocaleDateString(),
    },
    {
      key: 'daysLeft',
      header: 'Days Left',
      render: (row: Trial) => (
        <span className={`font-medium ${getDaysLeftClass(row)}`}>
          {getDaysLeftLabel(row)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (row: Trial) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div>
      <div className="page-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Trial Management</h1>
          <p className="page-subtitle">Monitor and manage salon owner trial periods</p>
        </div>
        <button onClick={() => void fetch()} className="btn-secondary ml-auto shrink-0 gap-1.5 px-3 text-xs">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Total Trials" value={stats?.total ?? '--'} icon={<FlaskConical size={18} />} />
        <StatCard title="Active Trials" value={stats?.active ?? '--'} icon={<FlaskConical size={18} />} color="info" />
        <StatCard title="Expired" value={stats?.expired ?? '--'} icon={<FlaskConical size={18} />} color="danger" />
        <StatCard title="Converted" value={stats?.converted ?? '--'} icon={<FlaskConical size={18} />} color="success" />
      </div>

      <div className="card mb-6 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Global Trial Period</h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              This setting applies to all future owners and recalculates all active owner trials.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                Trial Period (Days)
              </label>
              <input
                type="number"
                min={settings?.minDays ?? 1}
                max={settings?.maxDays ?? 365}
                className="input min-w-[180px]"
                value={trialPeriodInput}
                onChange={(e) => setTrialPeriodInput(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                Allowed range: {settings?.minDays ?? 1} to {settings?.maxDays ?? 365} days
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleSaveSettings()}
              disabled={isSaving}
              className="btn-primary gap-2"
            >
              <Save size={14} />
              {isSaving ? 'Saving...' : 'Save Trial Period'}
            </button>
          </div>
        </div>

        {settings ? (
          <div className="mt-3 rounded-lg bg-[var(--color-surface-raised)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
            Current global trial period: <strong>{settings.trialPeriodDays} days</strong>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {success ? <p className="mt-3 text-sm text-emerald-600">{success}</p> : null}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] p-4">
          {['', 'ACTIVE', 'EXPIRED', 'CONVERTED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === s
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)]'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          emptyMessage="No trials found."
          keyExtractor={(row) => row.id}
        />
      </div>
    </div>
  );
};

export default TrialsPage;
