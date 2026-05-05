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

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthLabel(date: Date, includeYear: boolean) {
  return date.toLocaleString('default', {
    month: 'short',
    ...(includeYear ? { year: '2-digit' } : {}),
  });
}

function buildMonthlyRevenueSeries(
  transactions: RevenueTransaction[],
  filters: RevenueFilters
) {
  const periodRange = getDateRange(filters.period);
  const explicitFromDate = filters.fromDate ? new Date(filters.fromDate) : null;
  const explicitToDate = filters.toDate ? new Date(filters.toDate) : null;
  const hasExplicitRange = Boolean(periodRange || explicitFromDate || explicitToDate);

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth(), 1);

  const startDate = explicitFromDate && !Number.isNaN(explicitFromDate.getTime())
    ? getMonthStart(explicitFromDate)
    : periodRange
      ? getMonthStart(periodRange.start)
      : defaultStart;

  const endDate = explicitToDate && !Number.isNaN(explicitToDate.getTime())
    ? getMonthStart(explicitToDate)
    : periodRange
      ? getMonthStart(periodRange.end)
      : defaultEnd;

  const safeStart = startDate <= endDate ? startDate : endDate;
  const safeEnd = endDate >= startDate ? endDate : startDate;
  const bucketMap = new Map<string, number>();

  transactions.forEach((transaction) => {
    const createdAt = new Date(transaction.createdAt);
    if (Number.isNaN(createdAt.getTime())) return;

    const key = getMonthKey(createdAt);
    bucketMap.set(key, (bucketMap.get(key) || 0) + Number(transaction.amount));
  });

  const includeYearInLabel = safeStart.getFullYear() !== safeEnd.getFullYear();
  const monthly: { month: string; amount: number }[] = [];
  const cursor = new Date(safeStart);

  while (cursor <= safeEnd) {
    const key = getMonthKey(cursor);
    monthly.push({
      month: formatMonthLabel(cursor, includeYearInLabel || hasExplicitRange),
      amount: bucketMap.get(key) || 0,
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return monthly;
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
  const monthly = buildMonthlyRevenueSeries(transactions, filters);

  return { totalRevenue, transactionCount: transactions.length, monthly };
};
