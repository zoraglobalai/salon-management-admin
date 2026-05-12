import { Request, Response, NextFunction, type RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { AppDataSource } from '../database/config';
import { User } from '../entities/platform/User';
import { UserMode, UserRole, type OperatorUserType } from '../entities/platform/User';
import type { AuthUserPayload } from '../shared/types/auth';

export interface AuthPayload {
  id: string;
  email: string;
  role: UserRole;
}

export type RequestUser = AuthPayload | AuthUserPayload;

const DEMO_OPERATOR_USER: AuthUserPayload = {
  tenant_id: '00000000-0000-0000-0000-000000000001',
  user_id: 'manager-demo',
  branch_id: '00000000-0000-0000-0000-000000000001',
  type: 'manager',
  role: UserRole.MANAGER,
  mode: UserMode.OPERATOR,
  has_manager: false,
  email: 'manager@velvetglow.com',
  full_name: 'Branch Manager',
  tenant_name: 'Velvet Glow Salon',
  branch_name: 'Main Branch',
};

export type AuthRequest = Request & {
  user?: RequestUser;
};

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

function isOperatorUserType(value: unknown): value is OperatorUserType {
  return value === 'admin' || value === 'owner' || value === 'manager' || value === 'staff';
}

function isUserMode(value: unknown): value is UserMode {
  return value === UserMode.OPERATOR || value === UserMode.MONITOR;
}

export function isAuthUserPayload(user: RequestUser | undefined): user is AuthUserPayload {
  return !!user && 'user_id' in user && 'type' in user && isOperatorUserType(user.type);
}

export const authMiddleware: RequestHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  const allowDemoOperator = ENV.NODE_ENV !== 'production';

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (allowDemoOperator) {
      req.user = DEMO_OPERATOR_USER;
      next();
      return;
    }

    res.status(401).json({ success: false, message: 'No token provided. Access denied.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as Partial<AuthPayload & AuthUserPayload>;

    // Verify user exists and the token still matches the latest active session.
    if (decoded.id) {
      const userRepo = AppDataSource.getRepository(User);
      const userExists = await userRepo.findOne({ where: { id: decoded.id } });
      if (!userExists || !userExists.isActive) {
        res.status(401).json({ success: false, message: 'Session invalidated. User deactivated or removed.' });
        return;
      }

      if (
        typeof decoded.session_version !== 'number' ||
        decoded.session_version !== userExists.sessionVersion
      ) {
        res.status(401).json({ success: false, message: 'Session invalidated. A newer login is active.' });
        return;
      }
    }

    if (
      decoded.user_id &&
      decoded.email &&
      decoded.full_name &&
      isOperatorUserType(decoded.type) &&
      (decoded.mode === undefined || isUserMode(decoded.mode))
    ) {
      req.user = {
        id: decoded.id,
        session_version: decoded.session_version,
        tenant_id: decoded.tenant_id ?? null,
        user_id: decoded.user_id,
        branch_id: decoded.branch_id ?? null,
        type: decoded.type,
        role: decoded.role,
        mode: decoded.mode,
        has_manager: decoded.has_manager,
        email: decoded.email,
        full_name: decoded.full_name,
        tenant_name: decoded.tenant_name,
        branch_name: decoded.branch_name,
      };
      next();
      return;
    }

    if (decoded.role && decoded.id && decoded.email) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };
      next();
      return;
    }

    res.status(401).json({ success: false, message: 'Invalid token payload.' });
    return;
  } catch (err) {
    if (allowDemoOperator) {
      req.user = DEMO_OPERATOR_USER;
      next();
      return;
    }

    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

export const requireAuth: RequestHandler = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  next();
};

export const requireSuperAdmin: RequestHandler = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== UserRole.SUPER_ADMIN) {
    res.status(403).json({ success: false, message: 'Access denied. Super Admin only.' });
    return;
  }
  next();
};

export const allowMode = (allowedModes: UserMode[]): RequestHandler => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !('mode' in req.user) || !req.user.mode || !allowedModes.includes(req.user.mode)) {
      res.status(403).json({ success: false, message: 'Access denied for this mode.' });
      return;
    }

    next();
  };
};
