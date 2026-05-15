import React, { useEffect, useState } from 'react';
import { CalendarDays, HeadphonesIcon, RefreshCw, Store, TriangleAlert, X, FileText } from 'lucide-react';
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
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

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
        <div className="min-w-[150px]">
          <p className="font-medium">{row.tenant?.businessName}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{row.tenant?.email}</p>
        </div>
      ),
    },
    {
      key: 'issue',
      header: 'Ticket Issue',
      render: (row: Ticket) => (
        <button
          type="button"
          onClick={() => setSelectedTicket(row)}
          className="max-w-[130px] cursor-pointer text-left text-sm text-[var(--color-text-primary)]"
          title="View full issue details"
        >
          {row.issue}
        </button>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row: Ticket) => (
        <div className="w-[260px]">
          <p className="truncate text-sm text-[var(--color-text-secondary)]">
            {row.description}
          </p>
          {row.resolution ? (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{row.resolution}</p>
          ) : null}
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row: Ticket) => <div className="w-[92px]"><StatusBadge status={row.status} /></div> },
    {
      key: 'createdAt',
      header: 'Date',
      render: (row: Ticket) => <div className="w-[96px] whitespace-nowrap">{new Date(row.createdAt).toLocaleDateString()}</div>,
    },
    {
      key: 'action',
      header: 'Action',
      render: (row: Ticket) =>
        row.status === 'CLOSED' ? (
          <div className="flex w-[110px] justify-center">
            <span className="whitespace-nowrap text-xs text-[var(--color-text-muted)]">Issue Closed</span>
          </div>
        ) : (
          <div className="flex w-[110px] justify-center">
            <button
              onClick={() => void handleAdvance(row)}
              disabled={updatingId === row.id}
              className={`min-w-[96px] whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                actionButtonStyles[row.status]
              }`}
            >
              {updatingId === row.id ? 'Updating...' : actionLabelMap[row.status]}
            </button>
          </div>
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

      {selectedTicket ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3">
          <div className="font-inherit w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Support Ticket Details</h2>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="rounded-md p-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-0 px-6 py-5 text-sm">
              <div className="grid grid-cols-[44px_1fr] items-start gap-4 border-b border-[var(--color-border)] py-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Store size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Business</p>
                  <p className="mt-1 text-1xl font-medium leading-tight text-[var(--color-text-primary)]">{selectedTicket.tenant?.businessName || '-'}</p>
                  <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{selectedTicket.tenant?.email || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-[44px_1fr] items-start gap-4 border-b border-[var(--color-border)] py-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <TriangleAlert size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Issue</p>
                  <p className="mt-1 text-1xl font-medium leading-tight text-[var(--color-text-primary)]">{selectedTicket.issue || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-[44px_1fr] items-start gap-4 border-b border-[var(--color-border)] py-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Description</p>
                  <div className="mt-1.5 max-h-24 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2">
                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--color-text-primary)]">
                    {selectedTicket.description || '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-0 pt-3 sm:grid-cols-2">
                <div className="border-b border-[var(--color-border)] pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Status</p>
                  <div className="mt-2 inline-flex items-center rounded-lg bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                    {selectedTicket.status.charAt(0) + selectedTicket.status.slice(1).toLowerCase()}
                  </div>
                </div>
                <div className="pt-3 sm:pl-4 sm:pt-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Date</p>
                  <div className="mt-2 flex items-center gap-2 text-[var(--color-text-primary)]">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                      <CalendarDays size={14} />
                    </span>
                    <span className="text-sm font-medium">{new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SupportPage;
