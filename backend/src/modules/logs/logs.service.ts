import { AppDataSource } from '../../database/config';
import { Log } from '../../entities/platform/Log';
import { RevenueTransaction, TransactionStatus } from '../../entities/platform/RevenueTransaction';
import { SupportTicket } from '../../entities/platform/SupportTicket';
import { Trial, TrialStatus } from '../../entities/platform/Trial';

const logRepo = () => AppDataSource.getRepository(Log);
const supportTicketRepo = () => AppDataSource.getRepository(SupportTicket);
const revenueRepo = () => AppDataSource.getRepository(RevenueTransaction);
const trialRepo = () => AppDataSource.getRepository(Trial);

type AdminNotification = {
  id: string;
  action: 'SUPPORT_TICKET_RAISED' | 'SUBSCRIPTION_PAYMENT' | 'TRIAL_ENDED';
  performedBy: string;
  details: string;
  createdAt: string;
};

function formatPlanLabel(plan?: string | null) {
  if (!plan) return 'subscription';
  return `${plan.charAt(0)}${plan.slice(1).toLowerCase()} plan`;
}

export const getAllLogs = async (limit = 100) => {
  return logRepo()
    .createQueryBuilder('log')
    .orderBy('log.createdAt', 'DESC')
    .take(limit)
    .getMany();
};

export const createLog = async (action: string, performedBy: string, details?: string, ipAddress?: string) => {
  const log = logRepo().create({ action, performedBy, details: details || null, ipAddress: ipAddress || null });
  return logRepo().save(log);
};

export const getAdminNotifications = async (limit = 20): Promise<AdminNotification[]> => {
  const cappedLimit = Math.max(1, Math.min(limit, 100));

  const [tickets, payments, expiredTrials] = await Promise.all([
    supportTicketRepo()
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.tenant', 'tenant')
      .orderBy('ticket.createdAt', 'DESC')
      .take(cappedLimit)
      .getMany(),
    revenueRepo()
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.tenant', 'tenant')
      .where('tx.status = :status', { status: TransactionStatus.PAID })
      .orderBy('tx.createdAt', 'DESC')
      .take(cappedLimit)
      .getMany(),
    trialRepo()
      .createQueryBuilder('trial')
      .leftJoinAndSelect('trial.tenant', 'tenant')
      .where('trial.status = :status', { status: TrialStatus.EXPIRED })
      .orderBy('trial.endDate', 'DESC')
      .take(cappedLimit)
      .getMany(),
  ]);

  const ticketNotifications: AdminNotification[] = tickets.map((ticket) => ({
    id: `ticket-${ticket.id}`,
    action: 'SUPPORT_TICKET_RAISED',
    performedBy: ticket.tenant?.email || 'unknown',
    details: `${ticket.tenant?.businessName || 'A business'} raised a support ticket for ${ticket.issue}`,
    createdAt: ticket.createdAt.toISOString(),
  }));

  const paymentNotifications: AdminNotification[] = payments.map((payment) => ({
    id: `payment-${payment.id}`,
    action: 'SUBSCRIPTION_PAYMENT',
    performedBy: payment.tenant?.email || 'unknown',
    details: `${payment.tenant?.businessName || 'A business'} paid Rs ${Number(payment.amount || 0).toFixed(2)} for ${formatPlanLabel(payment.plan)} via ${(payment.paymentMethod || 'manual').toUpperCase()}`,
    createdAt: payment.createdAt.toISOString(),
  }));

  const trialNotifications: AdminNotification[] = expiredTrials.map((trial) => {
    const trialEndedAt = new Date(trial.endDate);
    trialEndedAt.setHours(12, 0, 0, 0);

    return {
      id: `trial-${trial.id}`,
      action: 'TRIAL_ENDED',
      performedBy: trial.tenant?.email || 'unknown',
      details: `${trial.tenant?.businessName || 'A business'} trial period ended`,
      createdAt: trialEndedAt.toISOString(),
    };
  });

  return [...ticketNotifications, ...paymentNotifications, ...trialNotifications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, cappedLimit);
};
