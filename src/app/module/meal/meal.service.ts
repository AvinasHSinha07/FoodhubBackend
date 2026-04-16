import { Prisma } from '../../../generated/prisma';
import { prisma } from '../../lib/prisma';
import AppError from '../../errorHelpers/AppError';
import status from 'http-status';
import { buildPaginationMeta, TPaginationQueryOptions } from '../../shared/queryParser';

const createMeal = async (userId: string, data: Prisma.MealUncheckedCreateInput) => {
  // Get provider profile using userId
  const provider = await prisma.providerProfile.findUnique({
    where: { userId },
  });

  if (!provider) {
    throw new AppError(status.FORBIDDEN, 'Provider profile not found! Please create a profile first.');
  }

  // Verify category exists
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId as string },
  });

  if (!category) {
    throw new AppError(status.NOT_FOUND, 'Selected category does not exist!');
  }

  data.providerId = provider.id;

  const result = await prisma.meal.create({
    data,
    include: {
      category: true,
    }
  });

  return result;
};

type TMealFilters = {
  categoryId?: string;
  providerId?: string;
  isAvailable?: boolean;
  minPrice?: number;
  maxPrice?: number;
  dietaryTag?: string;
};

const getAllMeals = async (
  queryOptions: TPaginationQueryOptions,
  filters: TMealFilters
) => {
  const { searchTerm, skip, limit, sortBy, sortOrder, page } = queryOptions;
  const { categoryId, providerId, isAvailable, minPrice, maxPrice, dietaryTag } = filters;
  const conditions: Prisma.MealWhereInput[] = [];

  if (searchTerm) {
    conditions.push({
      OR: ['title', 'description', 'dietaryTag'].map((field) => ({
        [field]: { contains: searchTerm, mode: 'insensitive' },
      })),
    });
  }

  if (categoryId) conditions.push({ categoryId });
  if (providerId) conditions.push({ providerId });
  if (isAvailable !== undefined) conditions.push({ isAvailable });
  if (dietaryTag) conditions.push({ dietaryTag: { equals: dietaryTag, mode: 'insensitive' } });
  
  if (minPrice !== undefined) conditions.push({ price: { gte: minPrice } });
  if (maxPrice !== undefined) conditions.push({ price: { lte: maxPrice } });

  const whereConditions: Prisma.MealWhereInput = conditions.length > 0 ? { AND: conditions } : {};

  const [result, total] = await prisma.$transaction([
    prisma.meal.findMany({
      where: whereConditions,
      include: {
        category: true,
        provider: {
          include: {
            user: {
              select: {
                name: true,
              },
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
    prisma.meal.count({ where: whereConditions }),
  ]);

  return {
    meta: buildPaginationMeta(page, limit, total),
    data: result,
  };
};

const getMealById = async (id: string) => {
  const result = await prisma.meal.findUnique({
    where: { id },
    include: {
      category: true,
      provider: {
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      }
    }
  });

  if (!result) throw new AppError(status.NOT_FOUND, 'Meal not found!');

  return result;
};

const updateMeal = async (id: string, userId: string, data: Partial<Prisma.MealUpdateInput>) => {
  const meal = await prisma.meal.findUnique({ 
    where: { id },
    include: { provider: true }
  });
  
  if (!meal) throw new AppError(status.NOT_FOUND, 'Meal not found!');

  // Authorization map check
  if (meal.provider.userId !== userId) {
    throw new AppError(status.FORBIDDEN, 'You are not authorized to update this meal!');
  }

  // If patching the category - verify it works
  if (data.category && (data.category as any).connect?.id) {
    const category = await prisma.category.findUnique({
      where: { id: (data.category as any).connect.id },
    });
    if (!category) throw new AppError(status.NOT_FOUND, 'Selected category does not exist!');
  }

  const result = await prisma.meal.update({
    where: { id },
    data,
    include: { category: true }
  });

  return result;
};

const deleteMeal = async (id: string, userId: string) => {
  const meal = await prisma.meal.findUnique({ 
    where: { id },
    include: { provider: true } 
  });
  
  if (!meal) throw new AppError(status.NOT_FOUND, 'Meal not found!');

  if (meal.provider.userId !== userId) {
    throw new AppError(status.FORBIDDEN, 'You are not authorized to delete this meal!');
  }

  const result = await prisma.meal.delete({ where: { id } });
  return result;
};

export const MealServices = {
  createMeal,
  getAllMeals,
  getMealById,
  updateMeal,
  deleteMeal,
};