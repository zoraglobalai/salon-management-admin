import { AppDataSource } from '../../database/config';
import { Log } from '../../entities/platform/Log';
import { SupportTicket, TicketStatus } from '../../entities/platform/SupportTicket';
import { Tenant } from '../../entities/platform/Tenant';
import { UserRole, type OperatorUserType } from '../../entities/platform/User';
import { createError } from '../../middleware/errorHandler';

const ticketRepo = () => AppDataSource.getRepository(SupportTicket);
const logRepo = () => AppDataSource.getRepository(Log);
const tenantRepo = () => AppDataSource.getRepository(Tenant);

const SUPPORT_CONTACT = {
  name: 'Super Admin',
  phone: '+91 98765 43210',
};

type OwnerUserShape = {
  email?: string;
  role?: UserRole;
  type?: OperatorUserType;
  tenant_id?: string | null;
  tenantId?: string | null;
};

const OWNER_ROLES = new Set([UserRole.OWNER, UserRole.INDEPENDENT_OWNER]);

function getTenantIdFromUser(user?: OwnerUserShape) {
  return user?.tenant_id || user?.tenantId || null;
}

function assertOwnerAccess(user?: OwnerUserShape) {
  const hasOwnerRole = !!user?.role && OWNER_ROLES.has(user.role);
  const hasOwnerType = user?.type === 'owner';

  if (!hasOwnerRole && !hasOwnerType) {
    throw createError('Only owner accounts can manage support tickets.', 403);
  }

  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) {
    throw createError('Owner tenant not found.', 400);
  }

  return tenantId;
}

function formatTicket(ticket: SupportTicket) {
  return {
    id: ticket.id,
    issue: ticket.issue,
    description: ticket.description,
    status: ticket.status,
    resolution: ticket.resolution,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

function getNextTicketStatus(status: TicketStatus) {
  switch (status) {
    case TicketStatus.OPEN:
      return TicketStatus.IN_PROGRESS;
    case TicketStatus.IN_PROGRESS:
      return TicketStatus.RESOLVED;
    case TicketStatus.RESOLVED:
      return TicketStatus.CLOSED;
    case TicketStatus.CLOSED:
    default:
      return null;
  }
}

export const getSupportContact = async () => SUPPORT_CONTACT;

export const getOwnerTickets = async (user?: OwnerUserShape) => {
  const tenantId = assertOwnerAccess(user);
  const tickets = await ticketRepo().find({
    where: { tenantId },
    order: { createdAt: 'DESC' },
  });

  return tickets.map(formatTicket);
};

export const createOwnerTicket = async (
  user: OwnerUserShape | undefined,
  payload: { issue: string; description: string }
) => {
  const tenantId = assertOwnerAccess(user);
  const issue = payload.issue?.trim();
  const description = payload.description?.trim();

  if (!issue) {
    throw createError('Ticket issue is required.', 400);
  }

  if (!description) {
    throw createError('Ticket description is required.', 400);
  }

  const tenant = await tenantRepo().findOne({ where: { id: tenantId } });
  if (!tenant) {
    throw createError('Owner tenant not found.', 404);
  }

  const ticket = await ticketRepo().save(
    ticketRepo().create({
      tenantId,
      issue,
      description,
      status: TicketStatus.OPEN,
      resolution: null,
    })
  );

  await logRepo().save(
    logRepo().create({
      action: 'SUPPORT_TICKET_RAISED',
      performedBy: user?.email || 'unknown',
      details: `${tenant.businessName} raised a support ticket for ${ticket.issue}`,
    })
  );

  return formatTicket(ticket);
};

export const getAllTickets = async (status?: string) => {
  const query = ticketRepo()
    .createQueryBuilder('ticket')
    .leftJoinAndSelect('ticket.tenant', 'tenant')
    .orderBy('ticket.createdAt', 'DESC');

  if (status && Object.values(TicketStatus).includes(status.toUpperCase() as TicketStatus)) {
    query.where('ticket.status = :status', { status: status.toUpperCase() });
  }

  return query.getMany();
};

export const updateTicketStatus = async (
  id: string,
  status: TicketStatus,
  performedBy: string,
  resolution?: string | null
) => {
  const ticket = await ticketRepo().findOne({ where: { id }, relations: ['tenant'] });
  if (!ticket) throw createError('Ticket not found.', 404);

  const nextStatus = getNextTicketStatus(ticket.status);
  if (ticket.status !== status && status !== nextStatus) {
    throw createError(`Ticket can only move from ${ticket.status} to ${nextStatus || TicketStatus.CLOSED}.`, 409);
  }

  if (ticket.status === TicketStatus.CLOSED && status === TicketStatus.CLOSED) {
    return ticket;
  }

  ticket.status = status;
  ticket.resolution =
    resolution?.trim() ||
    (status === TicketStatus.RESOLVED
      ? 'Resolved by admin'
      : status === TicketStatus.CLOSED
        ? 'Closed by admin'
        : null);
  await ticketRepo().save(ticket);

  await logRepo().save(
    logRepo().create({
      action: 'CLOSE_TICKET',
      performedBy,
      details: `Updated ticket ${id} to ${status}`,
    })
  );

  return ticket;
};

export const getTicketStats = async () => {
  const [total, open, inProgress, resolved, closed] = await Promise.all([
    ticketRepo().count(),
    ticketRepo().count({ where: { status: TicketStatus.OPEN } }),
    ticketRepo().count({ where: { status: TicketStatus.IN_PROGRESS } }),
    ticketRepo().count({ where: { status: TicketStatus.RESOLVED } }),
    ticketRepo().count({ where: { status: TicketStatus.CLOSED } }),
  ]);
  return { total, open, inProgress, resolved, closed };
};
