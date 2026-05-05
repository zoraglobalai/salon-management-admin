import React, { useEffect, useState } from 'react';
import { usersApi } from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/Badge';
import { Search, RefreshCw, Users } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  email: string;
  businessName: string;
  ownerType: string;
  status: string;
  phone: string;
  createdAt: string;
  branches: any[];
  currentSubscription?: {
    plan: string;
    status: string;
    endDate: string;
  } | null;
}

interface UsersListPageProps {
  statusFilter?: string;
  title?: string;
  subtitle?: string;
}

const UsersListPage: React.FC<UsersListPageProps> = ({ statusFilter, title = 'Users', subtitle }) => {
  const [users, setUsers] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await usersApi.getAll(statusFilter);
      setUsers(res.data.data);
    } catch {
      setError('Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [statusFilter]);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.businessName.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      header: 'Owner',
      render: (row: Tenant) => (
        <div>
          <p className="font-medium text-[var(--color-text-primary)]">{row.name}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{row.email}</p>
        </div>
      ),
    },
    { key: 'businessName', header: 'Business Name' },
    {
      key: 'phone',
      header: 'Phone',
      render: (row: Tenant) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.phone || '—'}
        </span>
      ),
    },
    {
      key: 'ownerType',
      header: 'Type',
      render: (row: Tenant) => <StatusBadge status={row.ownerType} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Tenant) => <StatusBadge status={row.status} />,
    },
    {
      key: 'currentSubscription',
      header: 'Plan',
      render: (row: Tenant) =>
        row.currentSubscription ? (
          <div>
            <StatusBadge status={row.currentSubscription.plan} />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {row.currentSubscription.status} until {new Date(row.currentSubscription.endDate).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <span className="text-[var(--color-text-muted)]">No paid plan</span>
        ),
    },
    {
      key: 'branches',
      header: 'Branches',
      render: (row: Tenant) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.branches?.length || 0}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row: Tenant) => (
        <span className="text-[var(--color-text-muted)]">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        <button onClick={fetch} className="btn-secondary ml-auto shrink-0 gap-1.5 px-3 text-xs">
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              className="input pl-8"
              placeholder="Search by name, email, business..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] sm:ml-auto">
            <Users size={13} />
            {filtered.length} records
          </div>
        </div>

        {error && (
          <div className="m-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage="No users found."
          keyExtractor={(row) => row.id}
        />
      </div>
    </div>
  );
};

export const AllUsersPage: React.FC = () => (
  <UsersListPage title="All Users" subtitle="All registered salon owners across the platform" />
);

export const ActiveUsersPage: React.FC = () => (
  <UsersListPage
    statusFilter="ACTIVE"
    title="Active Users"
    subtitle="Owners with active subscriptions"
  />
);

export const TrialUsersPage: React.FC = () => (
  <UsersListPage
    statusFilter="TRIAL"
    title="Trial Users"
    subtitle="Owners currently in their trial period"
  />
);

export const ExpiredUsersPage: React.FC = () => (
  <UsersListPage
    statusFilter="EXPIRED"
    title="Expired Users"
    subtitle="Owners whose subscription or trial has expired"
  />
);

export default UsersListPage;
