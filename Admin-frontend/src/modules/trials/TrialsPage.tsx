import React, { useEffect, useState } from 'react';
import { trialsApi } from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import { FlaskConical, RefreshCw } from 'lucide-react';

interface Trial {
  id: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  status: string;
  tenant: { name: string; email: string; businessName: string };
}

const TrialsPage: React.FC = () => {
  const [data, setData] = useState<Trial[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = async () => {
    setIsLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        trialsApi.getAll(),
        trialsApi.getStats(),
      ]);
      setData(listRes.data.data);
      setStats(statsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const daysLeft = (endDate: string) => {
    const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const columns = [
    {
      key: 'tenant',
      header: 'Business',
      render: (row: Trial) => (
        <div>
          <p className="font-medium">{row.tenant?.businessName}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{row.tenant?.email}</p>
        </div>
      ),
    },
    {
      key: 'startDate',
      header: 'Start Date',
      render: (row: Trial) => new Date(row.startDate).toLocaleDateString(),
    },
    {
      key: 'endDate',
      header: 'End Date',
      render: (row: Trial) => new Date(row.endDate).toLocaleDateString(),
    },
    {
      key: 'daysLeft',
      header: 'Days Left',
      render: (row: Trial) => {
        const d = daysLeft(row.endDate);
        return (
          <span className={`font-medium ${d > 7 ? 'text-green-600' : d > 0 ? 'text-amber-600' : 'text-red-600'}`}>
            {d > 0 ? `${d} days` : 'Expired'}
          </span>
        );
      },
    },
    { key: 'status', header: 'Status', render: (row: Trial) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Trial Management</h1>
          <p className="page-subtitle">Monitor and manage salon owner trial periods</p>
        </div>
        <button onClick={fetch} className="btn-secondary gap-1.5 text-xs">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Trials" value={stats?.total ?? '—'} icon={<FlaskConical size={18} />} />
        <StatCard title="Active" value={stats?.active ?? '—'} icon={<FlaskConical size={18} />} color="info" />
        <StatCard title="Expired" value={stats?.expired ?? '—'} icon={<FlaskConical size={18} />} color="danger" />
        <StatCard title="Converted" value={stats?.converted ?? '—'} icon={<FlaskConical size={18} />} color="success" />
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          emptyMessage="No trials found."
          keyExtractor={(row) => row.id}
        />
      </div>
    </div>
  );
};

export default TrialsPage;
