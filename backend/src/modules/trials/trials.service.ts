import { AppDataSource } from '../../database/config';
import { Trial, TrialStatus } from '../../entities/platform/Trial';

const trialRepo = () => AppDataSource.getRepository(Trial);

export const getAllTrials = async (status?: string) => {
  const query = trialRepo()
    .createQueryBuilder('trial')
    .leftJoinAndSelect('trial.tenant', 'tenant')
    .orderBy('trial.createdAt', 'DESC');

  if (status) {
    query.where('trial.status = :status', { status: status.toUpperCase() });
  }

  return query.getMany();
};

export const getTrialStats = async () => {
  const [total, active, expired, converted] = await Promise.all([
    trialRepo().count(),
    trialRepo().count({ where: { status: TrialStatus.ACTIVE } }),
    trialRepo().count({ where: { status: TrialStatus.EXPIRED } }),
    trialRepo().count({ where: { status: TrialStatus.CONVERTED } }),
  ]);
  return { total, active, expired, converted };
};
