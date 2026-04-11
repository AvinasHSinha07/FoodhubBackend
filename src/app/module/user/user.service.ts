import status from 'http-status';
import { prisma } from '../../lib/prisma';
import AppError from '../../errorHelpers/AppError';
import { Prisma } from '@prisma/client';
import { buildPaginationMeta, TPaginationQueryOptions } from '../../shared/queryParser';

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
};