import { AppDataSource } from '../../database/config';
import { Tenant, TenantStatus } from '../../entities/platform/Tenant';
import { User, UserRole } from '../../entities/platform/User';
import { Branch } from '../../entities/platform/Branch';
import { Log } from '../../entities/platform/Log';
import bcrypt from 'bcryptjs';
import { createError } from '../../middleware/errorHandler';

const tenantRepo = () => AppDataSource.getRepository(Tenant);
const userRepo = () => AppDataSource.getRepository(User);
const branchRepo = () => AppDataSource.getRepository(Branch);
const logRepo = () => AppDataSource.getRepository(Log);

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
  return tenants;
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

  const allBranchAddresses = [input.mainBranchLocation, ...input.branchAddresses];

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
  const user = userRepo().create({
    name: input.name,
    email: input.email,
    password: hashedPassword,
    role,
    tenantId: savedTenant.id,
    isActive: true,
  });
  await userRepo().save(user);

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
