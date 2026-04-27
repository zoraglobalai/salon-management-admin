import { AppDataSource } from '../../database/config';
import { Subscription, SubscriptionStatus } from '../../entities/platform/Subscription';

const subRepo = () => AppDataSource.getRepository(Subscription);

export const getAllSubscriptions = async (status?: string) => {
  const query = subRepo()
    .createQueryBuilder('sub')
    .leftJoinAndSelect('sub.tenant', 'tenant')
    .orderBy('sub.createdAt', 'DESC');

  if (status && ['ACTIVE', 'EXPIRED'].includes(status.toUpperCase())) {
    query.where('sub.status = :status', { status: status.toUpperCase() });
  }

  return query.getMany();
};

export const getSubscriptionStats = async () => {
  const [total, active, expired] = await Promise.all([
    subRepo().count(),
    subRepo().count({ where: { status: SubscriptionStatus.ACTIVE } }),
    subRepo().count({ where: { status: SubscriptionStatus.EXPIRED } }),
  ]);
  return { total, active, expired };
};
