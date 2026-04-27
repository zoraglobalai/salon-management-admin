import { AppDataSource } from '../../database/config';
import { SupportTicket, TicketStatus } from '../../entities/platform/SupportTicket';
import { Log } from '../../entities/platform/Log';
import { createError } from '../../middleware/errorHandler';

const ticketRepo = () => AppDataSource.getRepository(SupportTicket);
const logRepo = () => AppDataSource.getRepository(Log);

export const getAllTickets = async (status?: string) => {
  const query = ticketRepo()
    .createQueryBuilder('ticket')
    .leftJoinAndSelect('ticket.tenant', 'tenant')
    .orderBy('ticket.createdAt', 'DESC');

  if (status) {
    query.where('ticket.status = :status', { status: status.toUpperCase() });
  }

  return query.getMany();
};

export const closeTicket = async (id: string, resolution: string, performedBy: string) => {
  const ticket = await ticketRepo().findOne({ where: { id } });
  if (!ticket) throw createError('Ticket not found.', 404);

  ticket.status = TicketStatus.CLOSED;
  ticket.resolution = resolution;
  await ticketRepo().save(ticket);

  await logRepo().save(
    logRepo().create({
      action: 'CLOSE_TICKET',
      performedBy,
      details: `Closed ticket ${id}`,
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
