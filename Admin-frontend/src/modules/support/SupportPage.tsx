import React, { useEffect, useState } from 'react';
import { supportApi } from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import { HeadphonesIcon, RefreshCw, X } from 'lucide-react';

interface Ticket {
  id: string;
  issue: string;
  status: string;
  resolution: string | null;
  createdAt: string;
  tenant: { name: string; businessName: string; email: string };
}

const SupportPage: React.FC = () => {
  const [data, setData] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const fetch = async () => {
    setIsLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        supportApi.getAll(statusFilter || undefined),
        supportApi.getStats(),
      ]);
      setData(listRes.data.data);
      setStats(statsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [statusFilter]);

  const handleClose = async (id: string) => {
    setClosingId(id);
    try {
      await supportApi.closeTicket(id);
      await fetch();
    } catch (err) {
      console.error(err);
    } finally {
      setClosingId(null);
    }
  };

  const columns = [
    {
      key: 'tenant',
      header: 'Business',
      render: (row: Ticket) => (
        <div>
          <p className="font-medium">{row.tenant?.businessName}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{row.tenant?.email}</p>
        </div>
      ),
    },
    {
      key: 'issue',
      header: 'Issue',
      render: (row: Ticket) => (
        <p className="max-w-xs text-sm text-[var(--color-text-secondary)] truncate" title={row.issue}>
          {row.issue}
        </p>
      ),
    },
    { key: 'status', header: 'Status', render: (row: Ticket) => <StatusBadge status={row.status} /> },
    {
      key: 'createdAt',
      header: 'Date',
      render: (row: Ticket) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: 'action',
      header: 'Action',
      render: (row: Ticket) =>
        row.status !== 'CLOSED' && row.status !== 'RESOLVED' ? (
          <button
            onClick={() => handleClose(row.id)}
            disabled={closingId === row.id}
            className="btn-ghost text-xs gap-1 !py-1 text-red-600 hover:bg-red-50"
          >
            <X size={12} />
            {closingId === row.id ? 'Closing...' : 'Close'}
          </button>
        ) : (
          <span className="text-xs text-[var(--color-text-muted)]">Resolved</span>
        ),
    },
  ];

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Support Tickets</h1>
          <p className="page-subtitle">Manage and resolve customer support issues</p>
        </div>
        <button onClick={fetch} className="btn-secondary gap-1.5 text-xs">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Tickets" value={stats?.total ?? '—'} icon={<HeadphonesIcon size={18} />} />
        <StatCard title="Open" value={stats?.open ?? '—'} icon={<HeadphonesIcon size={18} />} color="danger" />
        <StatCard title="In Progress" value={stats?.inProgress ?? '—'} icon={<HeadphonesIcon size={18} />} color="warning" />
        <StatCard title="Resolved" value={stats?.resolved ?? '—'} icon={<HeadphonesIcon size={18} />} color="success" />
      </div>

      <div className="card">
        <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border)]">
          {['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
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
          emptyMessage="No tickets found."
          keyExtractor={(row) => row.id}
        />
      </div>
    </div>
  );
};

export default SupportPage;
