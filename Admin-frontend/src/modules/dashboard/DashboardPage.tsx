import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  FlaskConical,
  UserX,
  IndianRupee,
  TrendingUp,
  CreditCard,
  Ticket,
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { usersApi, revenueApi, supportApi } from '../../services/api';

interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  expiredTenants: number;
}

interface RevenueOverview {
  totalRevenue: number;
  transactionCount: number;
  monthly: { month: string; amount: number }[];
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueOverview | null>(null);
  const [ticketStats, setTicketStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const revenueChartData = revenue?.monthly || [];
  const revenuePeak = revenueChartData.length
    ? revenueChartData.reduce((max, item) => (item.amount > max.amount ? item : max), revenueChartData[0])
    : null;
  const revenueLatest = revenueChartData.length ? revenueChartData[revenueChartData.length - 1] : null;
  const ownerSignupPieData = buildOwnerSignupPieData(stats);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, revenueRes, supportRes] = await Promise.all([
          usersApi.getStats(),
          revenueApi.getOverview(),
          supportApi.getStats(),
        ]);

        setStats(statsRes.data.data);
        setRevenue(revenueRes.data.data);
        setTicketStats(supportRes.data.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={isLoading ? '—' : stats?.totalTenants ?? 0}
          icon={<Users size={20} />}
          trend={{ value: 12, label: 'this month' }}
          color="default"
          onClick={() => navigate('/users')}
        />
        <StatCard
          title="Active Users"
          value={isLoading ? '—' : stats?.activeTenants ?? 0}
          icon={<UserCheck size={20} />}
          trend={{ value: 8, label: 'vs last month' }}
          color="success"
          onClick={() => navigate('/users/active')}
        />
        <StatCard
          title="Trial Users"
          value={isLoading ? '—' : stats?.trialTenants ?? 0}
          icon={<FlaskConical size={20} />}
          color="info"
          onClick={() => navigate('/users/trial')}
        />
        <StatCard
          title="Expired Users"
          value={isLoading ? '—' : stats?.expiredTenants ?? 0}
          icon={<UserX size={20} />}
          trend={{ value: -5, label: 'vs last month' }}
          color="danger"
          onClick={() => navigate('/users/expired')}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatCard
          title="Total Revenue"
          value={isLoading ? '—' : formatCurrency(revenue?.totalRevenue ?? 0)}
          icon={<IndianRupee size={20} />}
          trend={{ value: 18, label: 'this year' }}
          color="success"
          onClick={() => navigate('/revenue')}
        />
        <StatCard
          title="Transactions"
          value={isLoading ? '—' : revenue?.transactionCount ?? 0}
          icon={<CreditCard size={20} />}
          color="info"
        />
        <StatCard
          title="Open Tickets"
          value={isLoading ? '—' : ticketStats?.open ?? 0}
          icon={<Ticket size={20} />}
          color="warning"
          onClick={() => navigate('/support')}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <TrendingUp size={16} className="text-[var(--color-text-muted)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Revenue Over Time</h3>
              </div>
              <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {isLoading ? '—' : formatCompactCurrency(revenueLatest?.amount ?? 0)}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">Latest recorded revenue</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Peak</p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                  {isLoading ? '—' : formatCompactCurrency(revenuePeak?.amount ?? 0)}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)]">{revenuePeak?.month ?? '—'}</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Average</p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                  {isLoading ? '—' : formatCompactCurrency(getAverageRevenue(revenueChartData))}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)]">Per period</p>
              </div>
            </div>
          </div>

          {revenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  tickFormatter={(value) => formatAxisCurrency(Number(value))}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#16a34a"
                  strokeWidth={3}
                  fill="url(#revenueFill)"
                  dot={{ r: 4, fill: '#16a34a', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
              No revenue data yet.
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users size={16} className="text-[var(--color-text-muted)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Owner Signups</h3>
          </div>
          <div className="grid items-center gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={ownerSignupPieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={3}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {ownerSignupPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [Number(value), 'Owners']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-3">
              {ownerSignupPieData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-[var(--color-text-secondary)]">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{item.value}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{item.percent}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function getAverageRevenue(monthly: { month: string; amount: number }[]) {
  if (monthly.length === 0) return 0;

  return monthly.reduce((sum, item) => sum + item.amount, 0) / monthly.length;
}

function buildOwnerSignupPieData(stats: DashboardStats | null) {
  const active = stats?.activeTenants ?? 0;
  const trial = stats?.trialTenants ?? 0;
  const expired = stats?.expiredTenants ?? 0;
  const total = active + trial + expired;

  const items = [
    { name: 'Active', value: active, color: '#16a34a' },
    { name: 'Trial', value: trial, color: '#2563eb' },
    { name: 'Expired', value: expired, color: '#dc2626' },
  ];

  return items.map((item) => ({
    ...item,
    percent: total > 0 ? Math.round((item.value / total) * 100) : 0,
  }));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatAxisCurrency(value: number) {
  if (value >= 1000) {
    return `₹${Math.round(value / 1000)}k`;
  }

  return `₹${value}`;
}

export default DashboardPage;
