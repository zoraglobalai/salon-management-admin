import React, { useEffect, useState } from 'react';
import { revenueApi } from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import { IndianRupee, TrendingUp, RefreshCw } from 'lucide-react';

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

const RevenuePage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = async () => {
    setIsLoading(true);
    try {
      const [txRes, overviewRes] = await Promise.all([
        revenueApi.getAll(),
        revenueApi.getOverview(),
      ]);
      setTransactions(txRes.data.data);
      setOverview(overviewRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

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
      render: (row: Transaction) => <span className="text-[var(--color-text-secondary)]">{row.paymentMethod || '—'}</span>,
    },
    {
      key: 'description',
      header: 'Reference',
      render: (row: Transaction) => (
        <div>
          <p className="text-[var(--color-text-secondary)]">{row.transactionReference || '—'}</p>
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
        <button onClick={fetch} className="btn-secondary gap-1.5 text-xs">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          value={`Rs ${overview?.totalRevenue?.toFixed(2) ?? '0.00'}`}
          icon={<IndianRupee size={18} />}
          color="success"
          trend={{ value: 18, label: 'this year' }}
        />
        <StatCard
          title="Total Transactions"
          value={overview?.transactionCount ?? '—'}
          icon={<TrendingUp size={18} />}
          color="info"
        />
      </div>

      <div className="card">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">All Transactions</h3>
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
