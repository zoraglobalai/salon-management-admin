import { AppDataSource } from '../../database/config';
import { Log } from '../../entities/platform/Log';
import { SupportTicket, TicketStatus } from '../../entities/platform/SupportTicket';
import { Tenant } from '../../entities/platform/Tenant';
import { UserRole } from '../../entities/platform/User';
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
  tenant_id?: string | null;
  tenantId?: string | null;
};

const OWNER_ROLES = new Set([UserRole.OWNER, UserRole.INDEPENDENT_OWNER]);

function getTenantIdFromUser(user?: OwnerUserShape) {
  return user?.tenant_id || user?.tenantId || null;
}

function assertOwnerAccess(user?: OwnerUserShape) {
  if (!user?.role || !OWNER_ROLES.has(user.role)) {
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
      action: 'CREATE_TENANT',
      performedBy: user?.email || 'unknown',
      details: `Created support ticket ${ticket.id} for tenant ${tenant.businessName}`,
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

  ticket.status = status;
  ticket.resolution = resolution?.trim() || (status === TicketStatus.RESOLVED ? 'Resolved by admin' : status === TicketStatus.CLOSED ? 'Closed by admin' : null);
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
