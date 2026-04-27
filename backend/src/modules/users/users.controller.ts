import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import {
  getAllUsers,
  getUserById,
  createOwner,
  resetOwnerPassword,
  getDashboardStats,
} from './users.service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const collapseSpaces = (value: string) => value.replace(/\s+/g, ' ').trim();
const removeAllSpaces = (value: string) => value.replace(/\s+/g, '');
const normalizePhone = (value: string) => value.replace(/\D/g, '');

export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.query;
    const users = await getAllUsers(status as string);
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await getUserById(req.params.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const createOwnerCredentials = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name,
      email,
      businessName,
      phone,
      alternativePhone,
      mainBranchLocation,
      numberOfBranches,
      branchAddresses,
      password,
    } = req.body;

    if (!name || !email || !businessName || !mainBranchLocation || !numberOfBranches) {
      res.status(400).json({
        success: false,
        message:
          'name, email, businessName, mainBranchLocation, and numberOfBranches are required.',
      });
      return;
    }

    const parsedNumberOfBranches = Number(numberOfBranches);

    if (!Number.isInteger(parsedNumberOfBranches) || parsedNumberOfBranches < 1) {
      res.status(400).json({
        success: false,
        message: 'numberOfBranches must be a whole number greater than or equal to 1.',
      });
      return;
    }

    const normalizedBranchAddresses = Array.isArray(branchAddresses)
      ? branchAddresses
          .map((address) => (typeof address === 'string' ? collapseSpaces(address) : ''))
          .filter(Boolean)
      : [];
    const normalizedMainBranchLocation =
      typeof mainBranchLocation === 'string' ? collapseSpaces(mainBranchLocation) : '';
    const normalizedName = typeof name === 'string' ? collapseSpaces(name) : '';
    const normalizedEmail = typeof email === 'string' ? removeAllSpaces(email).toLowerCase() : '';
    const normalizedBusinessName =
      typeof businessName === 'string' ? collapseSpaces(businessName) : '';
    const normalizedPhoneValue = typeof phone === 'string' ? normalizePhone(phone) : '';
    const normalizedAlternativePhoneValue =
      typeof alternativePhone === 'string' ? normalizePhone(alternativePhone) : '';
    const normalizedPassword = typeof password === 'string' ? password.trim() : undefined;

    if (!normalizedName) {
      res.status(400).json({ success: false, message: 'Name is required.' });
      return;
    }

    if (normalizedName.length > 30) {
      res.status(400).json({ success: false, message: 'Name must be 30 characters or fewer.' });
      return;
    }

    if (!/^[A-Za-z ]+$/.test(normalizedName)) {
      res.status(400).json({ success: false, message: 'Name should contain letters only.' });
      return;
    }

    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      return;
    }

    if (!normalizedBusinessName) {
      res.status(400).json({ success: false, message: 'Business name is required.' });
      return;
    }

    if (!normalizedMainBranchLocation) {
      res.status(400).json({
        success: false,
        message: 'Please provide the main branch location.',
      });
      return;
    }

    if (normalizedPhoneValue && normalizedPhoneValue.length !== 10) {
      res.status(400).json({
        success: false,
        message: 'Primary phone must be exactly 10 digits.',
      });
      return;
    }

    if (normalizedAlternativePhoneValue && normalizedAlternativePhoneValue.length !== 10) {
      res.status(400).json({
        success: false,
        message: 'Alternative phone must be exactly 10 digits.',
      });
      return;
    }

    if (
      parsedNumberOfBranches > 1 &&
      normalizedBranchAddresses.length !== parsedNumberOfBranches - 1
    ) {
      res.status(400).json({
        success: false,
        message: `Please provide addresses for branch 2 to branch ${parsedNumberOfBranches}.`,
      });
      return;
    }

    const result = await createOwner({
      name: normalizedName,
      email: normalizedEmail,
      businessName: normalizedBusinessName,
      phone: normalizedPhoneValue || undefined,
      alternativePhone: normalizedAlternativePhoneValue || undefined,
      mainBranchLocation: normalizedMainBranchLocation,
      numberOfBranches: parsedNumberOfBranches,
      branchAddresses: normalizedBranchAddresses,
      password: normalizedPassword,
      performedBy: req.user!.email,
    });

    res.status(201).json({
      success: true,
      message: 'Owner credentials created successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const result = await resetOwnerPassword(tenantId, req.user!.email);
    res.status(200).json({ success: true, message: 'Password reset successfully.', data: result });
  } catch (error) {
    next(error);
  }
};

export const dashboardStats = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await getDashboardStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};
