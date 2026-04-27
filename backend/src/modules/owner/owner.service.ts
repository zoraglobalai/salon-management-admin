import { AppDataSource } from '../../database/config';
import { Branch } from '../../entities/platform/Branch';
import { User } from '../../entities/platform/User';
import { createError } from '../../middleware/errorHandler';
import bcrypt from 'bcryptjs';

const userRepo = () => AppDataSource.getRepository(User);
const branchRepo = () => AppDataSource.getRepository(Branch);

const getOwnerWithTenant = async (userId: string) => {
  const user = await userRepo().findOne({
    where: { id: userId },
    relations: ['tenant', 'tenant.branches'],
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  if (!user.tenantId) {
    throw createError('Owner tenant not found', 400);
  }

  return user;
};

export const getOwnerProfileService = async (userId: string) => {
  const user = await getOwnerWithTenant(userId);
  const tenantId = user.tenantId as string;

  const businessName = user.tenant?.businessName || 'Business Overview';
  const locations = user.tenant?.branches?.map((branch) => ({
    id: branch.id,
    name: branch.name.split('-')[0].trim(),
    city: branch.name.split('-')[0].trim(),
  })) || [];

  const totalManagers = await userRepo().count({
    where: {
      tenantId,
      role: 'MANAGER' as User['role'],
    },
  });

  return {
    businessName,
    locations,
    totalManagers,
  };
};

export const listOwnerManagersService = async (userId: string) => {
  const owner = await getOwnerWithTenant(userId);
  const tenantId = owner.tenantId as string;
  const managers = await userRepo().find({
    where: {
      tenantId,
      role: 'MANAGER' as User['role'],
    },
    relations: ['branch'],
    order: { createdAt: 'DESC' },
  });

  return managers.map((manager) => ({
    id: manager.id,
    name: manager.name,
    email: manager.email,
    branchId: manager.branchId,
    location: manager.branch?.name?.split('-')[0].trim() || 'Unassigned',
    status: manager.isActive ? 'ACTIVE' : 'INACTIVE',
  }));
};

type CreateManagerInput = {
  name: string;
  email: string;
  password: string;
  branchId: string;
};

export const createOwnerManagerService = async (userId: string, input: CreateManagerInput) => {
  const owner = await getOwnerWithTenant(userId);
  const tenantId = owner.tenantId as string;
  const normalizedEmail = input.email.trim().toLowerCase();

  const existingUser = await userRepo().findOne({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw createError('A user with this email already exists.', 409);
  }

  const branch = await branchRepo().findOne({
    where: {
      id: input.branchId,
      tenantId,
    },
  });

  if (!branch) {
    throw createError('Selected branch not found.', 404);
  }

  const existingManagerForBranch = await userRepo().findOne({
    where: {
      tenantId,
      branchId: branch.id,
      role: 'MANAGER' as User['role'],
    },
  });

  if (existingManagerForBranch) {
    throw createError('This branch already has a manager assigned.', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const manager = userRepo().create({
    name: input.name.trim(),
    email: normalizedEmail,
    password: passwordHash,
    role: 'MANAGER' as User['role'],
    tenantId,
    branchId: branch.id,
    isActive: true,
    isDefaultPassword: true,
  });

  const savedManager = await userRepo().save(manager);

  return {
    id: savedManager.id,
    name: savedManager.name,
    email: savedManager.email,
    branchId: branch.id,
    location: branch.name.split('-')[0].trim(),
    status: 'ACTIVE' as const,
  };
};

export const removeOwnerManagerService = async (userId: string, managerId: string) => {
  const owner = await getOwnerWithTenant(userId);
  const tenantId = owner.tenantId as string;
  const manager = await userRepo().findOne({
    where: {
      id: managerId,
      tenantId,
      role: 'MANAGER' as User['role'],
    },
  });

  if (!manager) {
    throw createError('Manager not found.', 404);
  }

  await userRepo().remove(manager);
};

export const resetOwnerManagerPasswordService = async (ownerId: string, managerId: string, newPassword: string) => {
  const owner = await getOwnerWithTenant(ownerId);
  const tenantId = owner.tenantId as string;
  
  const manager = await userRepo().findOne({
    where: {
      id: managerId,
      tenantId,
      role: 'MANAGER' as User['role'],
    },
  });

  if (!manager) {
    throw createError('Manager not found.', 404);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  manager.password = hashedPassword;
  manager.isDefaultPassword = true; // They must change it upon login

  await userRepo().save(manager);
  return true;
};
