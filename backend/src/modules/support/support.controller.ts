import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { TicketStatus } from '../../entities/platform/SupportTicket';
import {
  createOwnerTicket,
  getAllTickets,
  getOwnerTickets,
  getSupportContact,
  getTicketStats,
  updateTicketStatus,
} from './support.service';

export const ownerSupportContact = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await getSupportContact();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const ownerTicketList = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await getOwnerTickets(req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const ownerTicketCreate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { issue, description } = req.body ?? {};

    if (!issue || !description) {
      res.status(400).json({ success: false, message: 'Ticket issue and description are required.' });
      return;
    }

    const data = await createOwnerTicket(req.user, {
      issue: String(issue),
      description: String(description),
    });
    res.status(201).json({ success: true, message: 'Support ticket raised successfully.', data });
  } catch (error) {
    next(error);
  }
};

export const listTickets = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.query;
    const data = await getAllTickets(status as string);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

export const updateTicket = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body ?? {};

    if (!status || !Object.values(TicketStatus).includes(String(status).toUpperCase() as TicketStatus)) {
      res.status(400).json({ success: false, message: 'Valid ticket status is required.' });
      return;
    }

    const data = await updateTicketStatus(
      id,
      String(status).toUpperCase() as TicketStatus,
      req.user?.email || 'unknown',
      resolution ? String(resolution) : null
    );
    res.status(200).json({ success: true, message: 'Ticket updated successfully.', data });
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
