import { AppDataSource } from '../../database/config';
import { User, UserRole } from '../../entities/platform/User';
import { Log } from '../../entities/platform/Log';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env';
import { createError } from '../../middleware/errorHandler';
import { sendMail } from '../../shared/mail/mailer';
import { forceLogoutUser } from '../communications/socketGateway';

const userRepo = () => AppDataSource.getRepository(User);
const logRepo = () => AppDataSource.getRepository(Log);

const resolveOwnerMode = async (user: User) => {
  if (user.role === UserRole.MANAGER) {
    return 'OPERATOR' as const;
  }

  if (
    user.role === UserRole.OWNER ||
    user.role === UserRole.INDEPENDENT_OWNER
  ) {
    const tenantId = user.tenantId as string;
    const totalActiveManagers = await userRepo().count({
      where: {
        tenantId,
        role: UserRole.MANAGER,
        isActive: true,
      },
    });

    return totalActiveManagers > 0 ? ('MONITOR' as const) : ('OPERATOR' as const);
  }

  return 'OPERATOR' as const;
};

export const loginService = async (
  email: string,
  password: string,
  ipAddress?: string
) => {
  const user = await userRepo().findOne({ 
    where: { email },
    relations: ['tenant', 'tenant.branches', 'branch']
  });

  if (!user) throw createError('Invalid email or password.', 401);
  if (
    user.role !== UserRole.SUPER_ADMIN &&
    user.role !== UserRole.OWNER &&
    user.role !== UserRole.INDEPENDENT_OWNER &&
    user.role !== UserRole.MANAGER
  )
    throw createError('Access denied. Insufficient credentials required.', 403);
  if (!user.isActive) throw createError('Account is deactivated.', 403);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw createError('Invalid email or password.', 401);

  const operatorType = 
    user.role === UserRole.SUPER_ADMIN ? 'admin' :
    user.role === UserRole.MANAGER ? 'manager' :
    user.role === UserRole.INDEPENDENT_OWNER ? 'owner' : 'owner';
  const mode = await resolveOwnerMode(user);
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  await userRepo().save(user);
  forceLogoutUser(user.id, 'A newer login is active for this account.');

  const token = jwt.sign(
    { 
      id: user.id, 
      session_version: user.sessionVersion,
      email: user.email, 
      role: user.role,
      tenant_id: user.tenantId,
      user_id: user.id,
      branch_id: user.branchId,
      type: operatorType,
      mode,
      has_manager: user.hasManager,
      full_name: user.name,
      tenant_name: user.tenant?.businessName,
      branch_name: user.branch?.name,
    },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );

  // Audit log
  await logRepo().save(
    logRepo().create({
      action: 'LOGIN',
      performedBy: user.email,
      details: `${user.role} login`,
      ipAddress: ipAddress || null,
    })
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone:
        user.role === UserRole.MANAGER
          ? user.phone
          : (user.tenant?.phone ?? user.phone ?? null),
      shopName:
        user.role === UserRole.MANAGER
          ? (user.shopName ?? user.tenant?.businessName ?? '')
          : (user.tenant?.businessName ?? user.shopName ?? ''),
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId,
      mode,
      hasManager: user.hasManager,
      location: user.branch ? user.branch.name.split('-')[0].trim() : undefined,
      numberOfBranches: user.tenant?.numberOfBranches || 1,
      branches: user.tenant?.branches?.map(b => ({
        id: b.id,
        name: b.name,
        city: b.name.split('-')[0].trim()
      })) || []
    },
    isDefaultPassword: user.isDefaultPassword || false,
  };
};

export const forgotPasswordService = async (email: string) => {
  const user = await userRepo().findOne({ where: { email } });
  if (!user) {
    throw createError('No account found with this email.', 404);
  }

  if (user.role !== UserRole.OWNER && user.role !== UserRole.INDEPENDENT_OWNER) {
    throw createError('Only client owners can reset their password here.', 403);
  }

  // Generate a 6-digit code
  const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

  user.resetPasswordToken = resetToken;
  // Expires in 15 minutes
  user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);

  await userRepo().save(user);

  await sendMail({
    from: `"Salon Growth Engine" <${ENV.SMTP_FROM}>`,
    to: user.email,
    subject: 'Password Reset Request',
    text: `Your password reset code is: ${resetToken}\n\nIt expires in 15 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333;">Password Reset</h2>
        <p>You requested a password reset. Here is your verification code:</p>
        <div style="background-color: #f4f4f4; padding: 15px; font-size: 24px; text-align: center; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${resetToken}
        </div>
        <p>This code expires in 15 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  return true;
};

export const resetPasswordService = async (email: string, code: string, newPassword: string) => {
  const user = await userRepo().findOne({ where: { email } });
  
  if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
    throw createError('Invalid or expired reset code.', 400);
  }

  if (user.resetPasswordToken !== code) {
    throw createError('Invalid reset code.', 400);
  }

  if (user.resetPasswordExpires < new Date()) {
    throw createError('Reset code has expired.', 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  user.password = hashedPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  user.isDefaultPassword = false;
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;

  await userRepo().save(user);
  forceLogoutUser(user.id, 'Your password was reset. Please log in again.');

  await logRepo().save(
    logRepo().create({
      action: 'PASSWORD_RESET',
      performedBy: user.email,
      details: 'User reset their password via forgot password flow',
    })
  );

  return true;
};

export const changePasswordService = async (userId: string, oldPassword: string, newPassword: string) => {
  const user = await userRepo().findOne({ where: { id: userId } });
  if (!user) {
    throw createError('User not found.', 404);
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw createError('Incorrect current password.', 401);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  user.isDefaultPassword = false;
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;

  await userRepo().save(user);
  forceLogoutUser(user.id, 'Your password was changed. Please log in again.');

  await logRepo().save(
    logRepo().create({
      action: 'PASSWORD_CHANGE',
      performedBy: user.email,
      details: 'User changed their password via self-service',
    })
  );

  return true;
};
