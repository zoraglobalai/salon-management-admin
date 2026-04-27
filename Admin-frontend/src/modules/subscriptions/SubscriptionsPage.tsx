import React, { useEffect, useState } from 'react';
import { subscriptionsApi } from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import { CreditCard, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface Subscription {
  id: string;
  tenantId: string;
  plan: string;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  tenant: { name: string; email: string; businessName: string };
}

const SubscriptionsPage: React.FC = () => {
  const [data, setData] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetch = async () => {
    setIsLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        subscriptionsApi.getAll(statusFilter || undefined),
        subscriptionsApi.getStats(),
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

  const columns = [
    {
      key: 'tenant',
      header: 'Business',
      render: (row: Subscription) => (
        <div>
          <p className="font-medium">{row.tenant?.businessName}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{row.tenant?.email}</p>
        </div>
      ),
    },
    { key: 'plan', header: 'Plan', render: (row: Subscription) => <StatusBadge status={row.plan} /> },
    { key: 'status', header: 'Status', render: (row: Subscription) => <StatusBadge status={row.status} /> },
    {
      key: 'startDate',
      header: 'Start Date',
      render: (row: Subscription) => new Date(row.startDate).toLocaleDateString(),
    },
    {
      key: 'endDate',
      header: 'End Date',
      render: (row: Subscription) => new Date(row.endDate).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="page-subtitle">Manage all subscription plans and statuses</p>
        </div>
        <button onClick={fetch} className="btn-secondary gap-1.5 text-xs">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard title="Total" value={stats?.total ?? '—'} icon={<CreditCard size={18} />} />
        <StatCard title="Active" value={stats?.active ?? '—'} icon={<CheckCircle size={18} />} color="success" />
        <StatCard title="Expired" value={stats?.expired ?? '—'} icon={<XCircle size={18} />} color="danger" />
      </div>

      <div className="card">
        <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border)]">
          {['', 'ACTIVE', 'EXPIRED'].map((s) => (
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
          emptyMessage="No subscriptions found."
          keyExtractor={(row) => row.id}
        />
      </div>
    </div>
  );
};

export default SubscriptionsPage;
