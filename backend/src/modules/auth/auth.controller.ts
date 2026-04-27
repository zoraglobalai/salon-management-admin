import { Request, Response, NextFunction } from 'express';
import { loginService, forgotPasswordService, resetPasswordService, changePasswordService } from './auth.service';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const ipAddress = req.ip || req.socket.remoteAddress;
    const result = await loginService(email, password, ipAddress);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: (req as any).user,
  });
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required.' });
      return;
    }

    await forgotPasswordService(email);

    res.status(200).json({
      success: true,
      message: 'If the email exists, a reset code has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      res.status(400).json({ success: false, message: 'Email, code, and newPassword are required.' });
      return;
    }

    await resetPasswordService(email, code, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'oldPassword and newPassword are required.' });
      return;
    }

    await changePasswordService(userId, oldPassword, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};
