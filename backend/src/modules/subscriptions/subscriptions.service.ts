import { AppDataSource } from '../../database/config';
import {
  Subscription,
  SubscriptionPaymentMethod,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../entities/platform/Subscription';
import { RevenueTransaction, TransactionStatus } from '../../entities/platform/RevenueTransaction';
import { Tenant, TenantStatus } from '../../entities/platform/Tenant';
import { Trial, TrialStatus } from '../../entities/platform/Trial';
import { SupportTicket, TicketStatus } from '../../entities/platform/SupportTicket';
import { Log } from '../../entities/platform/Log';
import { UserRole } from '../../entities/platform/User';
import { createError } from '../../middleware/errorHandler';

const subRepo = () => AppDataSource.getRepository(Subscription);
const revenueRepo = () => AppDataSource.getRepository(RevenueTransaction);
const tenantRepo = () => AppDataSource.getRepository(Tenant);
const trialRepo = () => AppDataSource.getRepository(Trial);
const supportTicketRepo = () => AppDataSource.getRepository(SupportTicket);
const logRepo = () => AppDataSource.getRepository(Log);

const PLAN_CATALOG = [
  {
    id: SubscriptionPlan.STANDARD,
    label: 'Standard',
    price: 999,
    durationDays: 30,
    features: ['Single business subscription', 'Core reports and dashboard access', 'Manual payment support'],
  },
  {
    id: SubscriptionPlan.PRO,
    label: 'Pro',
    price: 2999,
    durationDays: 30,
    features: ['Advanced subscription tier', 'Priority platform access', 'Best fit for scaling salons'],
  },
  {
    id: SubscriptionPlan.CUSTOM,
    label: 'Custom',
    price: null,
    durationDays: 30,
    features: ['Custom branch capacity', 'Super Admin onboarding support', 'Tailored commercial terms'],
  },
];

const SUPPORT_CONTACT = {
  name: 'Super Admin',
  phone: '+91 98765 43210',
};

type OwnerUserShape = {
  id?: string;
  email?: string;
  role?: UserRole;
  tenant_id?: string | null;
  tenantId?: string | null;
};

const OWNER_ROLES = new Set([UserRole.OWNER, UserRole.INDEPENDENT_OWNER]);

function getTenantIdFromUser(user?: OwnerUserShape) {
  return user?.tenant_id || user?.tenantId || null;
}

function assertOwnerAccess(user?: OwnerUserShape) {
  if (!user?.role || !OWNER_ROLES.has(user.role)) {
    throw createError('Only owner accounts can manage subscriptions.', 403);
  }

  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) {
    throw createError('Owner tenant not found.', 400);
  }

  return tenantId;
}

function toIsoDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function generateTransactionReference(plan: SubscriptionPlan) {
  const timestamp = Date.now().toString().slice(-8);
  return `SUB-${plan}-${timestamp}`;
}

function getPlanPrice(plan: SubscriptionPlan) {
  const match = PLAN_CATALOG.find((item) => item.id === plan);
  if (!match || match.price === null) {
    throw createError('Unsupported plan for checkout.', 400);
  }

  return match.price;
}

function getEligiblePlans(currentSubscription: Subscription | null) {
  if (!currentSubscription || currentSubscription.status === SubscriptionStatus.EXPIRED) {
    return PLAN_CATALOG;
  }

  if (currentSubscription.plan === SubscriptionPlan.STANDARD) {
    return PLAN_CATALOG.filter((plan) => plan.id !== SubscriptionPlan.STANDARD);
  }

  if (currentSubscription.plan === SubscriptionPlan.PRO) {
    return PLAN_CATALOG.filter((plan) => plan.id === SubscriptionPlan.CUSTOM);
  }

  return [];
}

async function syncExpiredState(tenantId: string) {
  const activeSubscription = await subRepo().findOne({
    where: { tenantId, status: SubscriptionStatus.ACTIVE },
    order: { endDate: 'DESC', createdAt: 'DESC' },
  });

  if (activeSubscription && new Date(activeSubscription.endDate) < new Date()) {
    activeSubscription.status = SubscriptionStatus.EXPIRED;
    await subRepo().save(activeSubscription);
  }

  const activeTrial = await trialRepo().findOne({
    where: { tenantId, status: TrialStatus.ACTIVE },
    order: { endDate: 'DESC', createdAt: 'DESC' },
  });

  if (activeTrial && new Date(activeTrial.endDate) < new Date()) {
    activeTrial.status = TrialStatus.EXPIRED;
    await trialRepo().save(activeTrial);
  }
}

async function getCurrentSubscription(tenantId: string) {
  return subRepo().findOne({
    where: [{ tenantId, status: SubscriptionStatus.ACTIVE }, { tenantId, status: SubscriptionStatus.EXPIRED }],
    order: { status: 'ASC', endDate: 'DESC', createdAt: 'DESC' },
  });
}

async function getCurrentTrial(tenantId: string) {
  return trialRepo().findOne({
    where: [{ tenantId, status: TrialStatus.ACTIVE }, { tenantId, status: TrialStatus.EXPIRED }, { tenantId, status: TrialStatus.CONVERTED }],
    order: { endDate: 'DESC', createdAt: 'DESC' },
  });
}

function formatSubscriptionRecord(subscription: Subscription | null) {
  if (!subscription) return null;

  return {
    id: subscription.id,
    plan: subscription.plan,
    status: subscription.status,
    amountPaid: Number(subscription.amountPaid || 0).toFixed(2),
    paymentMethod: subscription.paymentMethod,
    transactionReference: subscription.transactionReference,
    startDate: toIsoDateOnly(new Date(subscription.startDate)),
    endDate: toIsoDateOnly(new Date(subscription.endDate)),
    createdAt: subscription.createdAt.toISOString(),
  };
}

function formatTrialRecord(trial: Trial | null) {
  if (!trial) return null;

  return {
    id: trial.id,
    status: trial.status,
    startDate: toIsoDateOnly(new Date(trial.startDate)),
    endDate: toIsoDateOnly(new Date(trial.endDate)),
  };
}

async function buildOwnerSubscriptionOverview(
  tenant: Tenant,
  currentSubscription: Subscription | null,
  currentTrial: Trial | null,
  options?: { persistTenantStatus?: boolean }
) {
  let tenantStatus = tenant.status;
  if (currentSubscription?.status === SubscriptionStatus.ACTIVE) {
    tenantStatus = TenantStatus.ACTIVE;
  } else if (currentTrial?.status === TrialStatus.ACTIVE) {
    tenantStatus = TenantStatus.TRIAL;
  } else if (currentSubscription?.status === SubscriptionStatus.EXPIRED || currentTrial?.status === TrialStatus.EXPIRED) {
    tenantStatus = TenantStatus.EXPIRED;
  }

  if (options?.persistTenantStatus !== false && tenant.status !== tenantStatus) {
    tenant.status = tenantStatus;
    await tenantRepo().save(tenant);
  }

  return {
    businessName: tenant.businessName,
    currentSubscription: formatSubscriptionRecord(currentSubscription),
    currentTrial: formatTrialRecord(currentTrial),
    tenantStatus,
    supportContact: SUPPORT_CONTACT,
    plans: getEligiblePlans(currentSubscription),
  };
}

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

export const getOwnerSubscriptionOverview = async (user?: OwnerUserShape) => {
  const tenantId = assertOwnerAccess(user);

  await syncExpiredState(tenantId);

  const tenant = await tenantRepo().findOne({ where: { id: tenantId } });
  if (!tenant) {
    throw createError('Owner tenant not found.', 404);
  }

  const [currentSubscription, currentTrial] = await Promise.all([
    getCurrentSubscription(tenantId),
    getCurrentTrial(tenantId),
  ]);

  return buildOwnerSubscriptionOverview(tenant, currentSubscription, currentTrial);
};

export const checkoutOwnerSubscription = async (
  user: OwnerUserShape | undefined,
  payload: { plan: SubscriptionPlan.STANDARD | SubscriptionPlan.PRO; paymentMethod: SubscriptionPaymentMethod }
) => {
  const tenantId = assertOwnerAccess(user);

  if (![SubscriptionPlan.STANDARD, SubscriptionPlan.PRO].includes(payload.plan)) {
    throw createError('Only Standard and Pro plans can be paid directly.', 400);
  }

  await syncExpiredState(tenantId);

  const overview = await getOwnerSubscriptionOverview(user);
  const allowedPlanIds = new Set(overview.plans.map((plan) => plan.id));
  if (!allowedPlanIds.has(payload.plan)) {
    throw createError('This plan is not available for the current subscription state.', 409);
  }

  const price = getPlanPrice(payload.plan);
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 30);
  const transactionReference = generateTransactionReference(payload.plan);
  let savedSubscription: Subscription | null = null;

  await AppDataSource.transaction(async (manager) => {
    await manager.update(
      Subscription,
      { tenantId, status: SubscriptionStatus.ACTIVE },
      { status: SubscriptionStatus.EXPIRED }
    );

    const activeTrial = await manager.findOne(Trial, { where: { tenantId, status: TrialStatus.ACTIVE } });
    if (activeTrial) {
      activeTrial.status = TrialStatus.CONVERTED;
      await manager.save(activeTrial);
    }

    const subscription = manager.create(Subscription, {
      tenantId,
      plan: payload.plan,
      status: SubscriptionStatus.ACTIVE,
      amountPaid: price,
      paymentMethod: payload.paymentMethod,
      transactionReference,
      startDate: now,
      endDate,
    });
    savedSubscription = await manager.save(subscription);

    const revenueTransaction = manager.create(RevenueTransaction, {
      tenantId,
      subscriptionId: savedSubscription.id,
      amount: price,
      plan: payload.plan,
      paymentMethod: payload.paymentMethod,
      transactionReference,
      status: TransactionStatus.PAID,
      description: `${payload.plan} subscription activated`,
    });
    await manager.save(revenueTransaction);

    await manager.update(Tenant, { id: tenantId }, { status: TenantStatus.ACTIVE });

    await manager.save(
      manager.create(Log, {
        action: 'UPDATE_SUBSCRIPTION',
        performedBy: user?.email || 'unknown',
        details: `Activated ${payload.plan} subscription for tenant ${tenantId}`,
      })
    );
  });

  const tenant = await tenantRepo().findOne({ where: { id: tenantId } });
  if (!tenant || !savedSubscription) {
    throw createError('Unable to refresh subscription after payment.', 500);
  }

  const currentTrial = await getCurrentTrial(tenantId);
  return buildOwnerSubscriptionOverview(tenant, savedSubscription, currentTrial);
};

export const requestOwnerCustomSubscription = async (user: OwnerUserShape | undefined, message: string) => {
  const tenantId = assertOwnerAccess(user);
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    throw createError('Custom subscription requirements are required.', 400);
  }

  await supportTicketRepo().save(
    supportTicketRepo().create({
      tenantId,
      issue: `Custom subscription request: ${trimmedMessage}`,
      status: TicketStatus.OPEN,
      resolution: null,
    })
  );

  await logRepo().save(
    logRepo().create({
      action: 'UPDATE_SUBSCRIPTION',
      performedBy: user?.email || 'unknown',
      details: `Created custom subscription request for tenant ${tenantId}`,
    })
  );

  return { supportContact: SUPPORT_CONTACT };
};
