import React, { useEffect, useState } from 'react';
import { IndianRupee, RefreshCw, Search, TrendingUp } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import { revenueApi } from '../../services/api';

interface Transaction {
  id: string;
  tenantId: string;
  amount: number;
  plan: string | null;
  paymentMethod: string | null;
  transactionReference: string | null;
  status: string;
  description: string;
  createdAt: string;
  tenant: { name: string; businessName: string };
}

type RevenuePeriod = '' | 'today' | 'yesterday' | 'last7days' | 'last30days';

const RevenuePage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [period, setPeriod] = useState<RevenuePeriod>('');

  const buildParams = (overrides?: {
    search?: string;
    plan?: string;
    fromDate?: string;
    toDate?: string;
    period?: RevenuePeriod;
  }) => {
    const nextSearch = overrides?.search ?? search;
    const nextPlan = overrides?.plan ?? plan;
    const nextFromDate = overrides?.fromDate ?? fromDate;
    const nextToDate = overrides?.toDate ?? toDate;
    const nextPeriod = overrides?.period ?? period;

    return {
      ...(nextSearch.trim() ? { search: nextSearch.trim() } : {}),
      ...(nextPlan ? { plan: nextPlan } : {}),
      ...(nextFromDate ? { fromDate: nextFromDate } : {}),
      ...(nextToDate ? { toDate: nextToDate } : {}),
      ...(nextPeriod ? { period: nextPeriod } : {}),
    };
  };

  const fetch = async (overrides?: {
    search?: string;
    plan?: string;
    fromDate?: string;
    toDate?: string;
    period?: RevenuePeriod;
  }) => {
    setIsLoading(true);
    try {
      const params = buildParams(overrides);
      const [txRes, overviewRes] = await Promise.all([
        revenueApi.getAll(params),
        revenueApi.getOverview(params),
      ]);
      setTransactions(txRes.data.data);
      setOverview(overviewRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetch();
  }, [search, plan, fromDate, toDate, period]);

  const columns = [
    {
      key: 'tenant',
      header: 'Business',
      render: (row: Transaction) => (
        <div>
          <p className="font-medium">{row.tenant?.businessName}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{row.tenant?.name}</p>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (row: Transaction) => <StatusBadge status={row.plan || 'UNKNOWN'} />,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row: Transaction) => (
        <span className="font-semibold text-[var(--color-text-primary)]">
          Rs {Number(row.amount).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Payment',
      render: (row: Transaction) => (
        <span className="text-[var(--color-text-secondary)]">{row.paymentMethod || '--'}</span>
      ),
    },
    {
      key: 'description',
      header: 'Reference',
      render: (row: Transaction) => (
        <div>
          <p className="text-[var(--color-text-secondary)]">{row.transactionReference || '--'}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{row.description || 'Subscription payment'}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row: Transaction) => <StatusBadge status={row.status} /> },
    {
      key: 'createdAt',
      header: 'Date',
      render: (row: Transaction) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Revenue</h1>
          <p className="page-subtitle">Track income and payment transactions</p>
        </div>
        <button onClick={() => void fetch()} className="btn-secondary gap-1.5 text-xs">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <StatCard
          title="Total Revenue"
          value={`Rs ${overview?.totalRevenue?.toFixed(2) ?? '0.00'}`}
          icon={<IndianRupee size={18} />}
          color="success"
          trend={{ value: 18, label: 'filtered results' }}
        />
        <StatCard
          title="Total Transactions"
          value={overview?.transactionCount ?? '--'}
          icon={<TrendingUp size={18} />}
          color="info"
        />
      </div>

      <div className="card">
        <div className="border-b border-[var(--color-border)] p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">All Transactions</h3>
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
                  const nextPeriod = period === item.value ? '' : (item.value as RevenuePeriod);
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
          data={transactions}
          isLoading={isLoading}
          emptyMessage="No transactions found."
          keyExtractor={(row) => row.id}
        />
      </div>
    </div>
  );
};

export default RevenuePage;
