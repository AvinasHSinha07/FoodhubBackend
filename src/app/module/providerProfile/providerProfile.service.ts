import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import AppError from '../../errorHelpers/AppError';
import status from 'http-status';
import { buildPaginationMeta, TPaginationQueryOptions } from '../../shared/queryParser';

const createMyProfile = async (userId: string, data: Prisma.ProviderProfileUncheckedCreateInput) => {
  const existingProfile = await prisma.providerProfile.findUnique({
    where: { userId },
  });

  if (existingProfile) {
    throw new AppError(status.CONFLICT, 'You already have a provider profile!');
  }

  data.userId = userId;

  const result = await prisma.providerProfile.create({ data });
  return result;
};

const getMyProfile = async (userId: string) => {
  const result = await prisma.providerProfile.findUnique({
    where: { userId },
    include: {
      meals: true,
    }
  });

  if (!result) {
    throw new AppError(status.NOT_FOUND, 'Provider profile not found!');
  }
  return result;
};

const updateMyProfile = async (userId: string, data: Partial<Prisma.ProviderProfileUpdateInput>) => {
  const profile = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(status.NOT_FOUND, 'Provider profile not found to update!');

  const result = await prisma.providerProfile.update({
    where: { userId },
    data,
  });
  return result;
};

type TProviderFilters = {
  cuisineType?: string;
  status?: string;
};

const getAllProviders = async (
  queryOptions: TPaginationQueryOptions,
  filters: TProviderFilters
) => {
  const { searchTerm, skip, limit, sortBy, sortOrder, page } = queryOptions;
  const { cuisineType, status } = filters;
  const conditions: Prisma.ProviderProfileWhereInput[] = [];

  if (searchTerm) {
    conditions.push({
      OR: ['restaurantName', 'cuisineType', 'address'].map((field) => ({
        [field]: { contains: searchTerm, mode: 'insensitive' },
      })),
    });
  }

  if (cuisineType) {
    conditions.push({
      cuisineType: {
        contains: cuisineType,
        mode: 'insensitive',
      },
    });
  }

  if (status) {
    conditions.push({
      user: {
        status: {
          equals: status as any,
        },
      },
    });
  }

  const whereConditions: Prisma.ProviderProfileWhereInput = conditions.length > 0 ? { AND: conditions } : {};

  const [result, total] = await prisma.$transaction([
    prisma.providerProfile.findMany({
      where: whereConditions,
      include: {
        user: {
          select: { id: true, name: true, status: true },
        },
        meals: {
          include: {
            reviews: {
              select: { rating: true },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),
    prisma.providerProfile.count({ where: whereConditions }),
  ]);

  return {
    meta: buildPaginationMeta(page, limit, total),
    data: result,
  };
};

const getProviderById = async (id: string) => {
  const result = await prisma.providerProfile.findUnique({
    where: { id },
    include: {
      user: {
         select: { id: true, name: true, email: true, status: true, isDeleted: true }
      },
      meals: {
         where: { isAvailable: true },
         include: {
           reviews: {
             select: { 
               id: true,
               rating: true,
               comment: true,
               createdAt: true,
               customer: {
                 select: { name: true, image: true }
               }
             }
           }
         }
      }
    }
  });

  if (!result) {
    throw new AppError(status.NOT_FOUND, 'Provider profile not found!');
  }
  return result;
};

export const ProviderProfileServices = {
  createMyProfile,
  getMyProfile,
  getProviderById,
  updateMyProfile,
  getAllProviders,
};