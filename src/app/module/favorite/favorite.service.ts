import status from 'http-status';
import AppError from '../../errorHelpers/AppError';
import { prisma } from '../../lib/prisma';
import { buildPaginationMeta, TPaginationQueryOptions } from '../../shared/queryParser';

const getMyMealFavorites = async (customerId: string, queryOptions: TPaginationQueryOptions) => {
  const [result, total] = await prisma.$transaction([
    prisma.mealFavorite.findMany({
      where: { customerId },
      include: {
        meal: {
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
        },
      },
      skip: queryOptions.skip,
      take: queryOptions.limit,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.mealFavorite.count({ where: { customerId } }),
  ]);

  return {
    meta: buildPaginationMeta(queryOptions.page, queryOptions.limit, total),
    data: result,
  };
};

const getMyProviderFavorites = async (customerId: string, queryOptions: TPaginationQueryOptions) => {
  const [result, total] = await prisma.$transaction([
    prisma.providerFavorite.findMany({
      where: { customerId },
      include: {
        provider: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
            meals: {
              where: { isAvailable: true },
              include: {
                reviews: {
                  select: {
                    rating: true,
                  },
                },
              },
            },
          },
        },
      },
      skip: queryOptions.skip,
      take: queryOptions.limit,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.providerFavorite.count({ where: { customerId } }),
  ]);

  return {
    meta: buildPaginationMeta(queryOptions.page, queryOptions.limit, total),
    data: result,
  };
};

const toggleMealFavorite = async (customerId: string, mealId: string) => {
  const meal = await prisma.meal.findUnique({ where: { id: mealId } });
  if (!meal) {
    throw new AppError(status.NOT_FOUND, 'Meal not found!');
  }

  const existingFavorite = await prisma.mealFavorite.findUnique({
    where: {
      customerId_mealId: {
        customerId,
        mealId,
      },
    },
  });

  if (existingFavorite) {
    await prisma.mealFavorite.delete({ where: { id: existingFavorite.id } });
    return { favorited: false };
  }

  await prisma.mealFavorite.create({
    data: {
      customerId,
      mealId,
    },
  });

  return { favorited: true };
};

const toggleProviderFavorite = async (customerId: string, providerId: string) => {
  const provider = await prisma.providerProfile.findUnique({ where: { id: providerId } });
  if (!provider) {
    throw new AppError(status.NOT_FOUND, 'Provider not found!');
  }

  const existingFavorite = await prisma.providerFavorite.findUnique({
    where: {
      customerId_providerId: {
        customerId,
        providerId,
      },
    },
  });

  if (existingFavorite) {
    await prisma.providerFavorite.delete({ where: { id: existingFavorite.id } });
    return { favorited: false };
  }

  await prisma.providerFavorite.create({
    data: {
      customerId,
      providerId,
    },
  });

  return { favorited: true };
};

const getFavoriteState = async (customerId: string, mealId?: string, providerId?: string) => {
  if (mealId) {
    const favorite = await prisma.mealFavorite.findUnique({
      where: {
        customerId_mealId: {
          customerId,
          mealId,
        },
      },
    });

    return { favorited: Boolean(favorite) };
  }

  if (providerId) {
    const favorite = await prisma.providerFavorite.findUnique({
      where: {
        customerId_providerId: {
          customerId,
          providerId,
        },
      },
    });

    return { favorited: Boolean(favorite) };
  }

  return { favorited: false };
};

export const FavoriteServices = {
  getMyMealFavorites,
  getMyProviderFavorites,
  toggleMealFavorite,
  toggleProviderFavorite,
  getFavoriteState,
};
