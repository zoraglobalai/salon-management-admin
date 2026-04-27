import React, { useEffect, useState } from 'react';
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
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

interface TenantRecord {
  id: string;
  status: string;
  createdAt: string;
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueOverview | null>(null);
  const [ticketStats, setTicketStats] = useState<any>(null);
  const [userGrowthData, setUserGrowthData] = useState<
    { month: string; total: number; active: number; trial: number; expired: number }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, revenueRes, supportRes, usersRes] = await Promise.all([
          usersApi.getStats(),
          revenueApi.getOverview(),
          supportApi.getStats(),
          usersApi.getAll(),
        ]);

        const tenants = Array.isArray(usersRes.data.data) ? (usersRes.data.data as TenantRecord[]) : [];

        setStats(statsRes.data.data);
        setRevenue(revenueRes.data.data);
        setTicketStats(supportRes.data.data);
        setUserGrowthData(buildUserGrowthData(tenants));
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
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Users"
          value={isLoading ? '—' : stats?.totalTenants ?? 0}
          icon={<Users size={20} />}
          trend={{ value: 12, label: 'this month' }}
          color="default"
        />
        <StatCard
          title="Active Users"
          value={isLoading ? '—' : stats?.activeTenants ?? 0}
          icon={<UserCheck size={20} />}
          trend={{ value: 8, label: 'vs last month' }}
          color="success"
        />
        <StatCard
          title="Trial Users"
          value={isLoading ? '—' : stats?.trialTenants ?? 0}
          icon={<FlaskConical size={20} />}
          color="info"
        />
        <StatCard
          title="Expired Users"
          value={isLoading ? '—' : stats?.expiredTenants ?? 0}
          icon={<UserX size={20} />}
          trend={{ value: -5, label: 'vs last month' }}
          color="danger"
        />
      </div>

      {/* Revenue + Support Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          value={isLoading ? '—' : `₹${revenue?.totalRevenue?.toFixed(2) ?? '0.00'}`}
          icon={<IndianRupee size={20} />}
          trend={{ value: 18, label: 'this year' }}
          color="success"
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
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-[var(--color-text-muted)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Revenue Over Time</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenue?.monthly || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Revenue']}
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#18181b"
                strokeWidth={2}
                dot={{ r: 4, fill: '#18181b' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* User Growth Chart */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-[var(--color-text-muted)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Owner Signups</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="total" name="Total" fill="#18181b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="active" name="Active" fill="#16a34a" radius={[3, 3, 0, 0]} />
              <Bar dataKey="trial" name="Trial" fill="#2563eb" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expired" name="Expired" fill="#dc2626" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

function buildUserGrowthData(tenants: TenantRecord[]) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    return {
      key,
      month: date.toLocaleString('default', { month: 'short' }),
      total: 0,
      active: 0,
      trial: 0,
      expired: 0,
    };
  });

  const monthMap = new Map(months.map((entry) => [entry.key, entry]));

  tenants.forEach((tenant) => {
    const createdAt = new Date(tenant.createdAt);
    if (Number.isNaN(createdAt.getTime())) return;

    const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
    const monthEntry = monthMap.get(key);
    if (!monthEntry) return;

    monthEntry.total += 1;

    if (tenant.status === 'ACTIVE') monthEntry.active += 1;
    if (tenant.status === 'TRIAL') monthEntry.trial += 1;
    if (tenant.status === 'EXPIRED') monthEntry.expired += 1;
  });

  return months;
}

export default DashboardPage;
