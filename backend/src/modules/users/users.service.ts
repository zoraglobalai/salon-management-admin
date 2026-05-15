import { AppDataSource } from '../../database/config';
import { Tenant, TenantStatus } from '../../entities/platform/Tenant';
import { CreatorRole, User, UserRole } from '../../entities/platform/User';
import { Branch } from '../../entities/platform/Branch';
import { Log } from '../../entities/platform/Log';
import { Trial, TrialStatus } from '../../entities/platform/Trial';
import bcrypt from 'bcryptjs';
import { createError } from '../../middleware/errorHandler';
import { calculateTrialEndDate, getTrialPeriodDays } from '../../shared/utils/trialSettings';
import { sendMail } from '../../shared/mail/mailer';
import { ENV } from '../../config/env';

const tenantRepo = () => AppDataSource.getRepository(Tenant);
const userRepo = () => AppDataSource.getRepository(User);
const branchRepo = () => AppDataSource.getRepository(Branch);
const logRepo = () => AppDataSource.getRepository(Log);
const trialRepo = () => AppDataSource.getRepository(Trial);

export const getAllUsers = async (status?: string) => {
  const query = tenantRepo()
    .createQueryBuilder('tenant')
    .leftJoinAndSelect('tenant.branches', 'branch')
    .leftJoinAndSelect('tenant.subscriptions', 'subscription')
    .orderBy('tenant.createdAt', 'DESC');

  if (status && ['ACTIVE', 'TRIAL', 'EXPIRED'].includes(status.toUpperCase())) {
    query.where('tenant.status = :status', { status: status.toUpperCase() });
  }

  const tenants = await query.getMany();
  return tenants.map((tenant) => {
    const sortedSubscriptions = [...(tenant.subscriptions || [])].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    const currentSubscription = sortedSubscriptions.find((subscription) => subscription.status === 'ACTIVE') || sortedSubscriptions[0] || null;

    return {
      ...tenant,
      currentSubscription,
    };
  });
};

export const getUserById = async (id: string) => {
  const tenant = await tenantRepo().findOne({
    where: { id },
    relations: ['branches', 'subscriptions', 'trials'],
  });
  if (!tenant) throw createError('User not found.', 404);
  return tenant;
};

export interface CreateOwnerInput {
  name: string;
  email: string;
  businessName: string;
  phone?: string;
  alternativePhone?: string;
  mainBranchLocation: string;
  numberOfBranches: number;
  branchAddresses: string[];
  password?: string;
  performedBy: string;
}

export const createOwner = async (input: CreateOwnerInput) => {
  // Check duplicate email
  const existing = await userRepo().findOne({ where: { email: input.email } });
  if (existing) throw createError('A user with this email already exists.', 409);

  const existingTenant = await tenantRepo().findOne({ where: { email: input.email } });
  if (existingTenant) throw createError('A tenant with this email already exists.', 409);

  // Generate or use provided password
  const rawPassword = input.password || generateStrongPassword();
  const hashedPassword = await bcrypt.hash(rawPassword, 12);
  const ownerType = input.numberOfBranches > 1 ? 'MULTI_BRANCH' : 'INDEPENDENT';

  // Create Tenant record
  const tenant = tenantRepo().create({
    name: input.name,
    email: input.email,
    businessName: input.businessName,
    phone: input.phone || null,
    alternativePhone: input.alternativePhone || null,
    numberOfBranches: input.numberOfBranches,
    ownerType: ownerType as any,
    status: TenantStatus.TRIAL,
  });
  const savedTenant = await tenantRepo().save(tenant);

  const trialDurationDays = await getTrialPeriodDays();
  const trialStartDate = new Date();
  const trialEndDate = calculateTrialEndDate(trialStartDate, trialDurationDays);

  await trialRepo().save(
    trialRepo().create({
      tenantId: savedTenant.id,
      startDate: trialStartDate,
      endDate: trialEndDate,
      status: TrialStatus.ACTIVE,
    })
  );

  const allBranchAddresses = [input.mainBranchLocation, ...input.branchAddresses].map(
    (address, index) => address || `Address pending for Branch ${index + 1}`
  );

  if (allBranchAddresses.length > 0) {
    const branches = allBranchAddresses.map((address, index) =>
      branchRepo().create({
        tenantId: savedTenant.id,
        name: `Branch ${index + 1}`,
        address,
        phone: null,
      })
    );
    await branchRepo().save(branches);
  }

  // Create User record (for client app login)
  const role = ownerType === 'INDEPENDENT' ? UserRole.INDEPENDENT_OWNER : UserRole.OWNER;
  const shouldApplyTempResetFlow =
    role === UserRole.OWNER || role === UserRole.INDEPENDENT_OWNER;
  const user = userRepo().create({
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    password: hashedPassword,
    role,
    shopName: input.businessName,
    tenantId: savedTenant.id,
    isActive: true,
    isTemporaryPassword: shouldApplyTempResetFlow,
    passwordResetRequired: shouldApplyTempResetFlow,
    createdByRole: CreatorRole.ADMIN,
  });
  await userRepo().save(user);

  const ownerTypeLabel =
    ownerType === 'MULTI_BRANCH' ? 'Multi-branch Owner' : 'Independent Owner';
  const branchLabel = input.numberOfBranches === 1 ? '1 branch' : `${input.numberOfBranches} branches`;

  try {
    await sendMail({
      from: `"Salon Growth Engine" <${ENV.SMTP_FROM}>`,
      to: input.email,
      subject: 'Your Salon Owner Account Credentials',
      text: `Hello ${input.name},

Your owner account has been created successfully.

Login Email: ${input.email}
Temporary Password: ${rawPassword}
Business: ${input.businessName}
Account Type: ${ownerTypeLabel}
Branches: ${branchLabel}

Please log in and change your password on first login.

If you did not expect this email, please contact support immediately.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e6e6e6; border-radius: 10px; overflow: hidden;">
          <div style="background: #111827; color: #ffffff; padding: 16px 20px;">
            <h2 style="margin: 0; font-size: 18px;">Owner Account Created</h2>
          </div>
          <div style="padding: 20px;">
            <p style="margin-top: 0;">Hello ${input.name},</p>
            <p>Your owner account has been created successfully. Use the credentials below to log in:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 14px 0;">
              <tr>
                <td style="padding: 8px; border: 1px solid #e6e6e6; background: #f9fafb; width: 180px;"><strong>Login Email</strong></td>
                <td style="padding: 8px; border: 1px solid #e6e6e6;">${input.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #e6e6e6; background: #f9fafb;"><strong>Temporary Password</strong></td>
                <td style="padding: 8px; border: 1px solid #e6e6e6; font-family: monospace;">${rawPassword}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #e6e6e6; background: #f9fafb;"><strong>Business</strong></td>
                <td style="padding: 8px; border: 1px solid #e6e6e6;">${input.businessName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #e6e6e6; background: #f9fafb;"><strong>Account Type</strong></td>
                <td style="padding: 8px; border: 1px solid #e6e6e6;">${ownerTypeLabel}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #e6e6e6; background: #f9fafb;"><strong>Branches</strong></td>
                <td style="padding: 8px; border: 1px solid #e6e6e6;">${branchLabel}</td>
              </tr>
            </table>
            <p style="margin-bottom: 8px;"><strong>Important:</strong> Please change this password immediately after first login.</p>
            <p style="margin-bottom: 0; color: #6b7280; font-size: 12px;">If you did not expect this email, please contact support immediately.</p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error(`Failed to send owner credential email to ${input.email}:`, error);
  }

  // Audit log
  await logRepo().save(
    logRepo().create({
      action: 'CREATE_OWNER',
      performedBy: input.performedBy,
      details: `Created owner account for ${input.email} (${ownerType}, ${input.numberOfBranches} branches)`,
    })
  );

  return {
    tenant: savedTenant,
    credentials: {
      email: input.email,
      temporaryPassword: rawPassword, // shown only once
    },
  };
};

export const resetOwnerPassword = async (tenantId: string, performedBy: string) => {
  const user = await userRepo().findOne({ where: { tenantId } });
  if (!user) throw createError('User not found.', 404);

  const newPassword = generateStrongPassword();
  user.password = await bcrypt.hash(newPassword, 12);
  const shouldApplyTempResetFlow =
    user.role === UserRole.OWNER || user.role === UserRole.INDEPENDENT_OWNER;
  user.isTemporaryPassword = shouldApplyTempResetFlow;
  user.passwordResetRequired = shouldApplyTempResetFlow;
  user.createdByRole = CreatorRole.ADMIN;
  await userRepo().save(user);

  await logRepo().save(
    logRepo().create({
      action: 'RESET_PASSWORD',
      performedBy,
      details: `Password reset for tenantId: ${tenantId}`,
    })
  );

  return { email: user.email, temporaryPassword: newPassword };
};

export const getDashboardStats = async () => {
  const [totalTenants, activeTenants, trialTenants, expiredTenants] = await Promise.all([
    tenantRepo().count(),
    tenantRepo().count({ where: { status: TenantStatus.ACTIVE } }),
    tenantRepo().count({ where: { status: TenantStatus.TRIAL } }),
    tenantRepo().count({ where: { status: TenantStatus.EXPIRED } }),
  ]);

  return { totalTenants, activeTenants, trialTenants, expiredTenants };
};

function generateStrongPassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*';
  const all = upper + lower + digits + special;

  let password =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    special[Math.floor(Math.random() * special.length)];

  for (let i = 4; i < 12; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
}
