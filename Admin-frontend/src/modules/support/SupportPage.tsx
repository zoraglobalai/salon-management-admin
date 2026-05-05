import React, { useEffect, useState } from 'react';
import { HeadphonesIcon, RefreshCw } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import { supportApi } from '../../services/api';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

interface Ticket {
  id: string;
  issue: string;
  description: string;
  status: TicketStatus;
  resolution: string | null;
  createdAt: string;
  tenant: { name: string; businessName: string; email: string };
}

const nextStatusMap: Record<Exclude<TicketStatus, 'CLOSED'>, TicketStatus> = {
  OPEN: 'IN_PROGRESS',
  IN_PROGRESS: 'RESOLVED',
  RESOLVED: 'CLOSED',
};

const actionLabelMap: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'Progress',
  RESOLVED: 'Solve',
  CLOSED: 'Issue Closed',
};

const actionButtonStyles: Record<Exclude<TicketStatus, 'CLOSED'>, string> = {
  OPEN: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200',
  RESOLVED: 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200',
};

const SupportPage: React.FC = () => {
  const [data, setData] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
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

  useEffect(() => {
    void fetch();
  }, [statusFilter]);

  const handleAdvance = async (ticket: Ticket) => {
    if (ticket.status === 'CLOSED') return;

    setUpdatingId(ticket.id);
    try {
      const nextStatus = nextStatusMap[ticket.status];
      const resolution =
        nextStatus === 'RESOLVED'
          ? 'Resolved by admin'
          : nextStatus === 'CLOSED'
            ? 'Closed by admin'
            : undefined;

      await supportApi.updateTicket(ticket.id, nextStatus, resolution);
      await fetch();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
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
      header: 'Ticket Issue',
      render: (row: Ticket) => <p className="text-sm text-[var(--color-text-primary)]">{row.issue}</p>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (row: Ticket) => (
        <div className="max-w-md">
          <p className="line-clamp-2 text-sm text-[var(--color-text-secondary)]" title={row.description}>
            {row.description}
          </p>
          {row.resolution ? (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{row.resolution}</p>
          ) : null}
        </div>
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
        row.status === 'CLOSED' ? (
          <span className="text-xs text-[var(--color-text-muted)]">Issue Closed</span>
        ) : (
          <button
            onClick={() => void handleAdvance(row)}
            disabled={updatingId === row.id}
            className={`min-w-[92px] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              actionButtonStyles[row.status]
            }`}
          >
            {updatingId === row.id ? 'Updating...' : actionLabelMap[row.status]}
          </button>
        ),
    },
  ];

  return (
    <div>
      <div className="page-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Support Tickets</h1>
          <p className="page-subtitle">Manage and resolve customer support issues</p>
        </div>
        <button onClick={() => void fetch()} className="btn-secondary ml-auto shrink-0 gap-1.5 px-3 text-xs">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Total Tickets" value={stats?.total ?? '--'} icon={<HeadphonesIcon size={18} />} />
        <StatCard title="Open" value={stats?.open ?? '--'} icon={<HeadphonesIcon size={18} />} color="danger" />
        <StatCard title="In Progress" value={stats?.inProgress ?? '--'} icon={<HeadphonesIcon size={18} />} color="warning" />
        <StatCard title="Resolved" value={stats?.resolved ?? '--'} icon={<HeadphonesIcon size={18} />} color="success" />
        <StatCard title="Closed" value={stats?.closed ?? '--'} icon={<HeadphonesIcon size={18} />} />
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] p-4">
          {['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
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
          emptyMessage="No tickets found."
          keyExtractor={(row) => row.id}
        />
      </div>
    </div>
  );
};

export default SupportPage;
