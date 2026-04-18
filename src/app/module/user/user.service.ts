import status from 'http-status';
import { prisma } from '../../lib/prisma';
import AppError from '../../errorHelpers/AppError';
import { Prisma } from '@prisma/client';
import { buildPaginationMeta, TPaginationQueryOptions } from '../../shared/queryParser';

type TCustomerAddressPayload = {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  instructions?: string;
  isDefault?: boolean;
};

type TUserFilters = {
  role?: string;
  status?: string;
};

const getAllUsers = async (
  queryOptions: TPaginationQueryOptions,
  filters: TUserFilters
) => {
  const { searchTerm, skip, limit, sortBy, sortOrder, page } = queryOptions;
  const { role, status } = filters;
  const conditions: Prisma.UserWhereInput[] = [];

  if (searchTerm) {
    conditions.push({
      OR: ['name', 'email'].map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  // Filter only ACTIVE & non-deleted users for general search
  conditions.push({ isDeleted: false });

  if (role) {
    conditions.push({
      role: {
        equals: role as any,
      },
    });
  }

  if (status) {
    conditions.push({
      status: {
        equals: status as any,
      },
    });
  }

  const whereConditions: Prisma.UserWhereInput = conditions.length > 0 ? { AND: conditions } : {};

  const [result, total] = await prisma.$transaction([
    prisma.user.findMany({
      where: whereConditions,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),
    prisma.user.count({ where: whereConditions }),
  ]);

  return {
    meta: buildPaginationMeta(page, limit, total),
    data: result,
  };
};

const getMyProfile = async (userEmail: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email: userEmail,
      isDeleted: false,
    },
    include: {
        providerProfile: true, // Includes provider specifics if they are a Provider
        addresses: {
          orderBy: [
            { isDefault: 'desc' },
            { updatedAt: 'desc' },
          ],
        },
    }
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, 'User profile not found!');
  }

  // Remove sensitive internals
  const { deletedAt, needPasswordChange, ...userProfile } = user;
  
  return userProfile;
};

const updateMyProfile = async (userEmail: string, payload: Partial<Prisma.UserUpdateInput>) => {
  const user = await prisma.user.findUnique({
    where: {
      email: userEmail,
      isDeleted: false,
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, 'User not found to update!');
  }

  const result = await prisma.user.update({
    where: { email: userEmail },
    data: payload,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return result;
};

const getCustomerAddresses = async (customerId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: customerId, isDeleted: false },
    select: { id: true, role: true },
  });

  if (!user || user.role !== 'CUSTOMER') {
    throw new AppError(status.NOT_FOUND, 'Customer profile not found!');
  }

  return prisma.customerAddress.findMany({
    where: { customerId },
    orderBy: [
      { isDefault: 'desc' },
      { updatedAt: 'desc' },
    ],
  });
};

const createCustomerAddress = async (customerId: string, payload: TCustomerAddressPayload) => {
  const existingAddressCount = await prisma.customerAddress.count({ where: { customerId } });
  const shouldSetDefault = payload.isDefault || existingAddressCount === 0;

  return prisma.$transaction(async (tx) => {
    if (shouldSetDefault) {
      await tx.customerAddress.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.customerAddress.create({
      data: {
        customerId,
        label: payload.label,
        line1: payload.line1,
        line2: payload.line2,
        city: payload.city,
        state: payload.state,
        postalCode: payload.postalCode,
        country: payload.country || 'Bangladesh',
        instructions: payload.instructions,
        isDefault: shouldSetDefault,
      },
    });
  });
};

const updateCustomerAddress = async (
  customerId: string,
  addressId: string,
  payload: Partial<TCustomerAddressPayload>
) => {
  const address = await prisma.customerAddress.findUnique({ where: { id: addressId } });

  if (!address || address.customerId !== customerId) {
    throw new AppError(status.NOT_FOUND, 'Address not found!');
  }

  return prisma.$transaction(async (tx) => {
    if (payload.isDefault) {
      await tx.customerAddress.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.customerAddress.update({
      where: { id: addressId },
      data: {
        ...payload,
        country: payload.country || undefined,
      },
    });
  });
};

const setDefaultAddress = async (customerId: string, addressId: string) => {
  const address = await prisma.customerAddress.findUnique({ where: { id: addressId } });

  if (!address || address.customerId !== customerId) {
    throw new AppError(status.NOT_FOUND, 'Address not found!');
  }

  return prisma.$transaction(async (tx) => {
    await tx.customerAddress.updateMany({
      where: { customerId, isDefault: true },
      data: { isDefault: false },
    });

    return tx.customerAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  });
};

const deleteCustomerAddress = async (customerId: string, addressId: string) => {
  const address = await prisma.customerAddress.findUnique({ where: { id: addressId } });

  if (!address || address.customerId !== customerId) {
    throw new AppError(status.NOT_FOUND, 'Address not found!');
  }

  await prisma.customerAddress.delete({ where: { id: addressId } });

  if (address.isDefault) {
    const latestAddress = await prisma.customerAddress.findFirst({
      where: { customerId },
      orderBy: { updatedAt: 'desc' },
    });

    if (latestAddress) {
      await prisma.customerAddress.update({
        where: { id: latestAddress.id },
        data: { isDefault: true },
      });
    }
  }

  return { deleted: true };
};

const updateUserStatus = async (userId: string, userStatus: 'ACTIVE' | 'BLOCKED') => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, 'User not found to update status!');
  }

  const result = await prisma.user.update({
    where: { id: userId },
    data: { status: userStatus },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return result;
};

export const UserServices = {
  getAllUsers,
  getMyProfile,
  updateMyProfile,
  updateUserStatus,
  getCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultAddress,
};