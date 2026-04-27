import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { getAllTickets, closeTicket, getTicketStats } from './support.service';

export const listTickets = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.query;
    const data = await getAllTickets(status as string);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

export const resolveTicket = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;
    const data = await closeTicket(id, resolution || 'Resolved by admin', req.user!.email);
    res.status(200).json({ success: true, message: 'Ticket closed.', data });
  } catch (error) {
    next(error);
  }
};

export const ticketStats = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await getTicketStats();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
