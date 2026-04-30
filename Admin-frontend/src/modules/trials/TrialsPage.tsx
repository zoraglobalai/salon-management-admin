import React, { useEffect, useState } from 'react';
import { FlaskConical, RefreshCw } from 'lucide-react';
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

const TrialsPage: React.FC = () => {
  const [data, setData] = useState<Trial[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetch = async () => {
    setIsLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        trialsApi.getAll(statusFilter || undefined),
        trialsApi.getStats(),
      ]);
      setData(listRes.data.data);
      setStats(statsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetch();
  }, [statusFilter]);

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
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Trial Management</h1>
          <p className="page-subtitle">Monitor and manage salon owner trial periods</p>
        </div>
        <button onClick={() => void fetch()} className="btn-secondary gap-1.5 text-xs">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <StatCard title="Total Trials" value={stats?.total ?? '--'} icon={<FlaskConical size={18} />} />
        <StatCard title="Active Trials" value={stats?.active ?? '--'} icon={<FlaskConical size={18} />} color="info" />
        <StatCard title="Expired" value={stats?.expired ?? '--'} icon={<FlaskConical size={18} />} color="danger" />
        <StatCard title="Converted" value={stats?.converted ?? '--'} icon={<FlaskConical size={18} />} color="success" />
      </div>

      <div className="card">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] p-4">
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
