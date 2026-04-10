import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import AppError from '../../errorHelpers/AppError';
import status from 'http-status';

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

const getAllProviders = async (filters: { searchTerm?: string }) => {
  const { searchTerm, ...filterData } = filters;
  const conditions: Prisma.ProviderProfileWhereInput[] = [];

  if (searchTerm) {
    conditions.push({
      OR: ['restaurantName', 'cuisineType', 'address'].map((field) => ({
        [field]: { contains: searchTerm, mode: 'insensitive' },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    conditions.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: { equals: (filterData as any)[key] },
      })),
    });
  }

  const result = await prisma.providerProfile.findMany({
    where: conditions.length > 0 ? { AND: conditions } : {},
    include: {
      user: {
         select: { id: true, name: true, email: true, status: true, isDeleted: true }
      }
    }
  });
  
  return result;
};

const getProviderById = async (id: string) => {
  const result = await prisma.providerProfile.findUnique({
    where: { id },
    include: {
      user: {
         select: { id: true, name: true, email: true, status: true, isDeleted: true }
      },
      meals: {
         where: { isAvailable: true }
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