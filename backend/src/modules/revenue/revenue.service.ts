import { AppDataSource } from '../../database/config';
import { RevenueTransaction, TransactionStatus } from '../../entities/platform/RevenueTransaction';
import { SelectQueryBuilder } from 'typeorm';

const revenueRepo = () => AppDataSource.getRepository(RevenueTransaction);

export type RevenueFilters = {
  status?: string;
  search?: string;
  plan?: string;
  fromDate?: string;
  toDate?: string;
  period?: 'today' | 'yesterday' | 'last7days' | 'last30days';
};

function getDateRange(period?: RevenueFilters['period']) {
  if (!period) return null;

  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === 'yesterday') {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === 'last7days') {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === 'last30days') {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  return null;
}

function applyRevenueFilters(
  query: SelectQueryBuilder<RevenueTransaction>,
  filters: RevenueFilters
) {
  if (filters.status) {
    query.andWhere('tx.status = :status', { status: filters.status.toUpperCase() });
  }

  if (filters.search?.trim()) {
    query.andWhere(
      '(LOWER(tenant."businessName") LIKE :search OR LOWER(COALESCE(tenant.name, \'\')) LIKE :search OR LOWER(COALESCE(tx.plan, \'\')) LIKE :search OR LOWER(COALESCE(tx.description, \'\')) LIKE :search)',
      {
      search: `%${filters.search.trim().toLowerCase()}%`,
      }
    );
  }

  if (filters.plan?.trim()) {
    query.andWhere('LOWER(COALESCE(tx.plan, \'\')) LIKE :plan', {
      plan: `%${filters.plan.trim().toLowerCase()}%`,
    });
  }

  const periodRange = getDateRange(filters.period);
  const fromDate = filters.fromDate ? new Date(filters.fromDate) : periodRange?.start;
  const toDate = filters.toDate ? new Date(filters.toDate) : periodRange?.end;

  if (fromDate && !Number.isNaN(fromDate.getTime())) {
    fromDate.setHours(0, 0, 0, 0);
    query.andWhere('tx."createdAt" >= :fromDate', { fromDate: fromDate.toISOString() });
  }

  if (toDate && !Number.isNaN(toDate.getTime())) {
    toDate.setHours(23, 59, 59, 999);
    query.andWhere('tx."createdAt" <= :toDate', { toDate: toDate.toISOString() });
  }

  return query;
}

export const getAllTransactions = async (filters: RevenueFilters = {}) => {
  const query = revenueRepo()
    .createQueryBuilder('tx')
    .leftJoinAndSelect('tx.tenant', 'tenant')
    .leftJoinAndSelect('tx.subscription', 'subscription')
    .orderBy('tx.createdAt', 'DESC');

  applyRevenueFilters(query, filters);
  return query.getMany();
};

export const getRevenueOverview = async (filters: RevenueFilters = {}) => {
  const query = revenueRepo()
    .createQueryBuilder('tx')
    .where('tx.status = :paidStatus', { paidStatus: TransactionStatus.PAID });

  if (filters.search?.trim() || filters.plan?.trim()) {
    query.leftJoin('tx.tenant', 'tenant');
  }

  applyRevenueFilters(query, { ...filters, status: TransactionStatus.PAID });
  const transactions = await query.getMany();

  const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  const monthlyMap: Record<string, number> = {};
  transactions.forEach((t) => {
    const month = new Date(t.createdAt).toLocaleString('default', { month: 'short', year: '2-digit' });
    monthlyMap[month] = (monthlyMap[month] || 0) + Number(t.amount);
  });

  const monthly = Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount }));

  return { totalRevenue, transactionCount: transactions.length, monthly };
};
