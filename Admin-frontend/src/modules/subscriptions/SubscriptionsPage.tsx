import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle, RefreshCw, Search, XCircle } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import { subscriptionsApi } from '../../services/api';

interface Subscription {
  id: string;
  tenantId: string;
  plan: string;
  status: string;
  amountPaid: number;
  paymentMethod: string | null;
  transactionReference: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  tenant: { name: string; email: string; businessName: string };
}

type SubscriptionPeriod = '' | 'today' | 'yesterday' | 'last7days' | 'last30days';

const formatMoney = (value: number) =>
  `Rs ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatPaymentMethod = (value: string | null) => {
  if (!value) return 'Manual';
  return value.charAt(0) + value.slice(1).toLowerCase();
};

const SubscriptionsPage: React.FC = () => {
  const [data, setData] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [period, setPeriod] = useState<SubscriptionPeriod>('');

  const buildParams = (overrides?: {
    statusFilter?: string;
    search?: string;
    plan?: string;
    fromDate?: string;
    toDate?: string;
    period?: SubscriptionPeriod;
  }) => {
    const nextStatusFilter = overrides?.statusFilter ?? statusFilter;
    const nextSearch = overrides?.search ?? search;
    const nextPlan = overrides?.plan ?? plan;
    const nextFromDate = overrides?.fromDate ?? fromDate;
    const nextToDate = overrides?.toDate ?? toDate;
    const nextPeriod = overrides?.period ?? period;

    return {
      ...(nextStatusFilter ? { status: nextStatusFilter } : {}),
      ...(nextSearch.trim() ? { search: nextSearch.trim() } : {}),
      ...(nextPlan ? { plan: nextPlan } : {}),
      ...(nextFromDate ? { fromDate: nextFromDate } : {}),
      ...(nextToDate ? { toDate: nextToDate } : {}),
      ...(nextPeriod ? { period: nextPeriod } : {}),
    };
  };

  const fetch = async (overrides?: {
    statusFilter?: string;
    search?: string;
    plan?: string;
    fromDate?: string;
    toDate?: string;
    period?: SubscriptionPeriod;
  }) => {
    setIsLoading(true);
    try {
      const params = buildParams(overrides);
      const [listRes, statsRes] = await Promise.all([
        subscriptionsApi.getAll(params),
        subscriptionsApi.getStats(params),
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
  }, [statusFilter, search, plan, fromDate, toDate, period]);

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
      key: 'amountPaid',
      header: 'Amount',
      render: (row: Subscription) => formatMoney(row.amountPaid),
    },
    {
      key: 'paymentMethod',
      header: 'Payment Type',
      render: (row: Subscription) => formatPaymentMethod(row.paymentMethod),
    },
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
        <button onClick={() => void fetch()} className="btn-secondary gap-1.5 text-xs">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard title="Total" value={stats?.total ?? '--'} icon={<CreditCard size={18} />} />
        <StatCard title="Active" value={stats?.active ?? '--'} icon={<CheckCircle size={18} />} color="success" />
        <StatCard title="Expired" value={stats?.expired ?? '--'} icon={<XCircle size={18} />} color="danger" />
      </div>

      <div className="card">
        <div className="border-b border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2">
            {['', 'ACTIVE', 'EXPIRED'].map((s) => (
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

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.6fr_0.9fr_repeat(2,0.9fr)]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by business name or plan"
                className="input pl-8"
              />
            </div>
            <select
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
              className="input"
            >
              <option value="">All Plans</option>
              <option value="STANDARD">Standard</option>
              <option value="PRO">Pro</option>
              <option value="CUSTOM">Custom</option>
            </select>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                if (event.target.value) setPeriod('');
              }}
              className="input"
            />
            <input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                if (event.target.value) setPeriod('');
              }}
              className="input"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[
              { label: 'Today', value: 'today' },
              { label: 'Yesterday', value: 'yesterday' },
              { label: 'Last 7 Days', value: 'last7days' },
              { label: 'Last 30 Days', value: 'last30days' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  const nextPeriod = period === item.value ? '' : (item.value as SubscriptionPeriod);
                  setPeriod(nextPeriod);
                  setFromDate('');
                  setToDate('');
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  period === item.value
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)]'
                }`}
              >
                {item.label}
              </button>
            ))}

            <button
              onClick={() => {
                setSearch('');
                setPlan('');
                setFromDate('');
                setToDate('');
                setPeriod('');
              }}
              className="rounded-full bg-[var(--color-surface-raised)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary-light)]"
            >
              Clear Filters
            </button>
          </div>
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
