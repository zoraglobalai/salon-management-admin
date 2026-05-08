import { AppDataSource } from '../../database/config';
import { Tenant, TenantStatus } from '../../entities/platform/Tenant';
import { Trial, TrialStatus } from '../../entities/platform/Trial';
import { createError } from '../../middleware/errorHandler';

const TRIAL_PERIOD_SETTING_KEY = 'trial_period_days';
const DEFAULT_TRIAL_PERIOD_DAYS = 7;
const MIN_TRIAL_PERIOD_DAYS = 1;
const MAX_TRIAL_PERIOD_DAYS = 365;

function normalizeTrialPeriodDays(value: unknown) {
  const parsedValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isInteger(parsedValue) || parsedValue < MIN_TRIAL_PERIOD_DAYS || parsedValue > MAX_TRIAL_PERIOD_DAYS) {
    return null;
  }

  return parsedValue;
}

export function getTrialPeriodConstraints() {
  return {
    defaultDays: DEFAULT_TRIAL_PERIOD_DAYS,
    minDays: MIN_TRIAL_PERIOD_DAYS,
    maxDays: MAX_TRIAL_PERIOD_DAYS,
  };
}

export function calculateTrialEndDate(startDate: Date, durationDays: number) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays);
  return endDate;
}

export async function getTrialPeriodDays() {
  const rows = await AppDataSource.query(
    `
      SELECT value
      FROM platform_settings
      WHERE key = $1
      LIMIT 1
    `,
    [TRIAL_PERIOD_SETTING_KEY]
  );

  const normalizedValue = normalizeTrialPeriodDays(rows[0]?.value);
  return normalizedValue ?? DEFAULT_TRIAL_PERIOD_DAYS;
}

export async function updateTrialPeriodDays(days: number) {
  const normalizedDays = normalizeTrialPeriodDays(days);
  if (normalizedDays === null) {
    throw createError(`Trial period must be an integer between ${MIN_TRIAL_PERIOD_DAYS} and ${MAX_TRIAL_PERIOD_DAYS} days.`, 400);
  }

  await AppDataSource.transaction(async (manager) => {
    await manager.query(
      `
        INSERT INTO platform_settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `,
      [TRIAL_PERIOD_SETTING_KEY, String(normalizedDays)]
    );

    const activeTrials = await manager.find(Trial, { where: { status: TrialStatus.ACTIVE } });
    const now = new Date();

    for (const trial of activeTrials) {
      const recalculatedEndDate = calculateTrialEndDate(new Date(trial.startDate), normalizedDays);
      trial.endDate = recalculatedEndDate;
      trial.status = recalculatedEndDate < now ? TrialStatus.EXPIRED : TrialStatus.ACTIVE;
      await manager.save(trial);

      const tenant = await manager.findOne(Tenant, { where: { id: trial.tenantId } });
      if (!tenant) {
        continue;
      }

      if (trial.status === TrialStatus.EXPIRED) {
        tenant.status = TenantStatus.EXPIRED;
      } else if (tenant.status !== TenantStatus.ACTIVE) {
        tenant.status = TenantStatus.TRIAL;
      }

      await manager.save(tenant);
    }
  });

  return normalizedDays;
}
