import { AppDataSource } from '../../database/config';
import { RevenueTransaction, TransactionStatus } from '../../entities/platform/RevenueTransaction';

const revenueRepo = () => AppDataSource.getRepository(RevenueTransaction);

export const getAllTransactions = async (status?: string) => {
  const query = revenueRepo()
    .createQueryBuilder('tx')
    .leftJoinAndSelect('tx.tenant', 'tenant')
    .orderBy('tx.createdAt', 'DESC');

  if (status) {
    query.where('tx.status = :status', { status: status.toUpperCase() });
  }

  return query.getMany();
};

export const getRevenueOverview = async () => {
  const transactions = await revenueRepo().find({ where: { status: TransactionStatus.PAID } });

  const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  // Group by month for chart data
  const monthlyMap: Record<string, number> = {};
  transactions.forEach((t) => {
    const month = new Date(t.createdAt).toLocaleString('default', { month: 'short', year: '2-digit' });
    monthlyMap[month] = (monthlyMap[month] || 0) + Number(t.amount);
  });

  const monthly = Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount }));

  return { totalRevenue, transactionCount: transactions.length, monthly };
};
