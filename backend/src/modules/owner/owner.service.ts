import { AppDataSource } from '../../database/config';
import { Branch } from '../../entities/platform/Branch';
import { Tenant } from '../../entities/platform/Tenant';
import { User } from '../../entities/platform/User';
import { createError } from '../../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import { Log } from '../../entities/platform/Log';
import { forceLogoutUser } from '../communications/socketGateway';

const userRepo = () => AppDataSource.getRepository(User);
const branchRepo = () => AppDataSource.getRepository(Branch);
const tenantRepo = () => AppDataSource.getRepository(Tenant);
const logRepo = () => AppDataSource.getRepository(Log);

const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ');
const normalizeEmail = (value: string) => value.trim().toLowerCase();

const getUserWithTenant = async (userId: string) => {
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
  const user = await getUserWithTenant(userId);
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
    profile: {
      role: user.role,
      fullName: user.name,
      email: user.email,
      phone: user.role === 'MANAGER' ? (user.phone || '') : (user.tenant?.phone || user.phone || ''),
      shopName:
        user.role === 'MANAGER'
          ? (user.shopName || user.tenant?.businessName || '')
          : (user.tenant?.businessName || user.shopName || ''),
    },
  };
};

type UpdateProfileInput = {
  fullName: string;
  email: string;
  phone?: string;
  shopName: string;
};

export const updateOwnerProfileService = async (userId: string, input: UpdateProfileInput) => {
  const user = await getUserWithTenant(userId);
  const tenantId = user.tenantId as string;

  const fullName = normalizeText(input.fullName);
  const email = normalizeEmail(input.email);
  const phone = (input.phone || '').trim();
  const shopName = normalizeText(input.shopName);

  if (!fullName) {
    throw createError('Full name is required.', 400);
  }

  if (!email) {
    throw createError('Email is required.', 400);
  }

  if (!shopName) {
    throw createError('Shop name is required.', 400);
  }

  const duplicateUser = await userRepo().findOne({ where: { email } });
  if (duplicateUser && duplicateUser.id !== user.id) {
    throw createError('A user with this email already exists.', 409);
  }

  user.name = fullName;
  user.email = email;

  if (user.role === 'MANAGER') {
    user.phone = phone || null;
    user.shopName = shopName;
    await userRepo().save(user);

    await logRepo().save(
      logRepo().create({
        action: 'UPDATE_MANAGER_PROFILE',
        performedBy: user.email,
        details: `Manager profile updated for tenant ${tenantId}`,
      })
    );

    return {
      role: user.role,
      fullName: user.name,
      email: user.email,
      phone: user.phone || '',
      shopName: user.shopName || '',
    };
  }

  const tenant = user.tenant;
  if (!tenant) {
    throw createError('Owner tenant not found.', 400);
  }

  const duplicateTenant = await tenantRepo().findOne({ where: { email } });
  if (duplicateTenant && duplicateTenant.id !== tenant.id) {
    throw createError('A tenant with this email already exists.', 409);
  }

  user.phone = phone || null;
  user.shopName = shopName;
  tenant.name = fullName;
  tenant.email = email;
  tenant.phone = phone || null;
  tenant.businessName = shopName;

  await tenantRepo().save(tenant);
  await userRepo().save(user);

  await logRepo().save(
    logRepo().create({
      action: 'UPDATE_OWNER_PROFILE',
      performedBy: user.email,
      details: `Owner profile updated for tenant ${tenantId}`,
    })
  );

  return {
    role: user.role,
    fullName: user.name,
    email: user.email,
    phone: tenant.phone || '',
    shopName: tenant.businessName,
  };
};

export const listOwnerManagersService = async (userId: string) => {
  const owner = await getUserWithTenant(userId);
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
    phone: manager.phone || '',
    shopName: manager.shopName || manager.branch?.name?.split('-')[0].trim() || owner.tenant?.businessName || '',
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
  const owner = await getUserWithTenant(userId);
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
    phone: null,
    password: passwordHash,
    role: 'MANAGER' as User['role'],
    tenantId,
    branchId: branch.id,
    shopName: owner.tenant?.businessName || branch.name.split('-')[0].trim(),
    isActive: true,
    isDefaultPassword: true,
  });

  const savedManager = await userRepo().save(manager);

  // Update owner's hasManager flag
  owner.hasManager = true;
  await userRepo().save(owner);

  return {
    id: savedManager.id,
    name: savedManager.name,
    email: savedManager.email,
    phone: savedManager.phone || '',
    shopName: savedManager.shopName || owner.tenant?.businessName || '',
    branchId: branch.id,
    location: branch.name.split('-')[0].trim(),
    status: 'ACTIVE' as const,
  };
};

export const removeOwnerManagerService = async (userId: string, managerId: string) => {
  const owner = await getUserWithTenant(userId);
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

  // Check if there are any remaining managers
  const remainingManagers = await userRepo().count({
    where: {
      tenantId,
      role: 'MANAGER' as User['role'],
    },
  });

  // If no managers left, update owner's hasManager flag
  if (remainingManagers === 0) {
    owner.hasManager = false;
    await userRepo().save(owner);
  }
};

export const resetOwnerManagerPasswordService = async (ownerId: string, managerId: string, newPassword: string) => {
  const owner = await getUserWithTenant(ownerId);
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
  manager.sessionVersion = (manager.sessionVersion ?? 0) + 1;

  await userRepo().save(manager);
  forceLogoutUser(manager.id, 'Your password was reset by the owner. Please log in again.');

  await logRepo().save(
    logRepo().create({
      action: 'RESET_MANAGER_PASSWORD',
      performedBy: owner.email,
      details: `Manager password reset for ${manager.email}`,
    })
  );

  return true;
};
