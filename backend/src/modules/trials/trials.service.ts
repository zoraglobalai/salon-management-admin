import { AppDataSource } from '../../database/config';
import { Log } from '../../entities/platform/Log';
import { Tenant, TenantStatus } from '../../entities/platform/Tenant';
import { Trial, TrialStatus } from '../../entities/platform/Trial';
import {
  calculateTrialEndDate,
  getTrialPeriodConstraints,
  getTrialPeriodDays,
  updateTrialPeriodDays,
} from '../../shared/utils/trialSettings';

const trialRepo = () => AppDataSource.getRepository(Trial);
const tenantRepo = () => AppDataSource.getRepository(Tenant);
const logRepo = () => AppDataSource.getRepository(Log);

async function ensureTrialCoverage() {
  const trialDurationDays = await getTrialPeriodDays();
  const tenantsWithoutTrials = await tenantRepo()
    .createQueryBuilder('tenant')
    .leftJoin('tenant.trials', 'trial')
    .where('trial.id IS NULL')
    .andWhere('tenant.status IN (:...statuses)', { statuses: [TenantStatus.TRIAL, TenantStatus.ACTIVE, TenantStatus.EXPIRED] })
    .getMany();

  if (!tenantsWithoutTrials.length) {
    return;
  }

  const trials = tenantsWithoutTrials.map((tenant) => {
    const startDate = new Date(tenant.createdAt);
    const endDate = calculateTrialEndDate(startDate, trialDurationDays);

    let status = TrialStatus.ACTIVE;
    if (tenant.status === TenantStatus.ACTIVE) {
      status = TrialStatus.CONVERTED;
    } else if (tenant.status === TenantStatus.EXPIRED) {
      status = TrialStatus.EXPIRED;
    }

    return trialRepo().create({
      tenantId: tenant.id,
      startDate,
      endDate,
      status,
    });
  });

  await trialRepo().save(trials);
}

async function syncExpiredTrials() {
  await ensureTrialCoverage();

  const activeTrials = await trialRepo().find({ where: { status: TrialStatus.ACTIVE } });
  const today = new Date();

  for (const trial of activeTrials) {
    if (new Date(trial.endDate) < today) {
      trial.status = TrialStatus.EXPIRED;
      await trialRepo().save(trial);

      const tenant = await tenantRepo().findOne({ where: { id: trial.tenantId } });
      if (tenant) {
        await logRepo().save(
          logRepo().create({
            action: 'TRIAL_ENDED',
            performedBy: tenant.email,
            details: `${tenant.businessName} trial period ended`,
          })
        );
      }
    }
  }
}

export const getAllTrials = async (status?: string) => {
  await syncExpiredTrials();

  const query = trialRepo()
    .createQueryBuilder('trial')
    .leftJoinAndSelect('trial.tenant', 'tenant')
    .orderBy('trial.createdAt', 'DESC');

  if (status && Object.values(TrialStatus).includes(status.toUpperCase() as TrialStatus)) {
    query.where('trial.status = :status', { status: status.toUpperCase() });
  }

  return query.getMany();
};

export const getTrialStats = async () => {
  await syncExpiredTrials();

  const [total, active, expired, converted] = await Promise.all([
    trialRepo().count(),
    trialRepo().count({ where: { status: TrialStatus.ACTIVE } }),
    trialRepo().count({ where: { status: TrialStatus.EXPIRED } }),
    trialRepo().count({ where: { status: TrialStatus.CONVERTED } }),
  ]);
  return { total, active, expired, converted };
};

export const getTrialSettings = async () => {
  const trialPeriodDays = await getTrialPeriodDays();
  return {
    trialPeriodDays,
    ...getTrialPeriodConstraints(),
  };
};

export const saveTrialSettings = async (days: number) => {
  const trialPeriodDays = await updateTrialPeriodDays(days);
  return {
    trialPeriodDays,
    ...getTrialPeriodConstraints(),
  };
};
