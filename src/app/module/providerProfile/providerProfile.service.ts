import { Prisma } from '../../../generated/prisma';
import { prisma } from '../../lib/prisma';
import AppError from '../../errorHelpers/AppError';
import status from 'http-status';
import { buildPaginationMeta, TPaginationQueryOptions } from '../../shared/queryParser';

type TAvailabilityWindowInput = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed?: boolean;
};

const WEEKDAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const normalizeAvailabilityWindows = (availabilityWindows: TAvailabilityWindowInput[] = []) => {
  const byDay = new Map<number, TAvailabilityWindowInput>();

  availabilityWindows.forEach((window) => {
    byDay.set(window.dayOfWeek, {
      dayOfWeek: window.dayOfWeek,
      openTime: window.openTime,
      closeTime: window.closeTime,
      isClosed: window.isClosed ?? false,
    });
  });

  return Array.from(byDay.values()).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
};

const toMinutes = (value: string): number => {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};

const getLocalDateContext = (timezone: string) => {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  const parts = formatter.formatToParts(new Date());
  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    dayOfWeek: WEEKDAY_ORDER.indexOf((partMap.weekday as any) || 'Sun'),
    currentMinutes: Number(partMap.hour || '0') * 60 + Number(partMap.minute || '0'),
    dateKey: `${partMap.year}-${partMap.month}-${partMap.day}`,
  };
};

const getAvailabilityMeta = (
  provider: {
    timezone?: string | null;
    preparationTimeMinutes: number;
    availabilityWindows?: Array<{
      dayOfWeek: number;
      openTime: string;
      closeTime: string;
      isClosed: boolean;
    }>;
    specialClosures?: Array<{
      date: Date;
      reason: string | null;
    }>;
  }
) => {
  const timezone = provider.timezone || 'UTC';
  const windows = provider.availabilityWindows || [];
  const closures = provider.specialClosures || [];

  if (windows.length === 0) {
    return {
      isOpenNow: true,
      nextOpenAt: null,
      estimatedReadyInMinutes: provider.preparationTimeMinutes,
      availabilityLabel: `Open now • ${provider.preparationTimeMinutes} min prep`,
    };
  }

  const context = getLocalDateContext(timezone);
  const closureSet = new Set(closures.map((closure) => closure.date.toISOString().slice(0, 10)));
  const todayClosed = closureSet.has(context.dateKey);

  const todaysWindow = windows.find((window) => window.dayOfWeek === context.dayOfWeek);

  const isWindowOpen = (() => {
    if (!todaysWindow || todaysWindow.isClosed || todayClosed) {
      return false;
    }

    const openMinutes = toMinutes(todaysWindow.openTime);
    const closeMinutes = toMinutes(todaysWindow.closeTime);

    if (openMinutes === closeMinutes) {
      return true;
    }

    if (closeMinutes > openMinutes) {
      return context.currentMinutes >= openMinutes && context.currentMinutes < closeMinutes;
    }

    return context.currentMinutes >= openMinutes || context.currentMinutes < closeMinutes;
  })();

  let nextOpenAt: string | null = null;

  if (!isWindowOpen) {
    for (let offset = 0; offset < 7; offset += 1) {
      const targetDay = (context.dayOfWeek + offset) % 7;
      const targetWindow = windows.find((window) => window.dayOfWeek === targetDay);

      if (!targetWindow || targetWindow.isClosed) {
        continue;
      }

      if (
        offset === 0 &&
        !todayClosed &&
        context.currentMinutes < toMinutes(targetWindow.openTime)
      ) {
        nextOpenAt = `Today ${targetWindow.openTime}`;
        break;
      }

      if (offset > 0) {
        nextOpenAt = `${WEEKDAY_ORDER[targetDay]} ${targetWindow.openTime}`;
        break;
      }
    }
  }

  return {
    isOpenNow: isWindowOpen,
    nextOpenAt,
    estimatedReadyInMinutes: provider.preparationTimeMinutes,
    availabilityLabel: isWindowOpen
      ? `Open now • ${provider.preparationTimeMinutes} min prep`
      : nextOpenAt
      ? `Closed • Opens ${nextOpenAt}`
      : 'Closed today',
  };
};

const createMyProfile = async (userId: string, data: Prisma.ProviderProfileUncheckedCreateInput) => {
  const existingProfile = await prisma.providerProfile.findUnique({
    where: { userId },
  });

  if (existingProfile) {
    throw new AppError(status.CONFLICT, 'You already have a provider profile!');
  }

  const payload = data as Prisma.ProviderProfileUncheckedCreateInput & {
    availabilityWindows?: TAvailabilityWindowInput[];
  };

  const availabilityWindows = normalizeAvailabilityWindows(payload.availabilityWindows || []);
  delete (payload as any).availabilityWindows;
  payload.userId = userId;

  const result = await prisma.$transaction(async (tx) => {
    const createdProfile = await tx.providerProfile.create({ data: payload });

    if (availabilityWindows.length > 0) {
      await tx.providerAvailabilityWindow.createMany({
        data: availabilityWindows.map((window) => ({
          providerId: createdProfile.id,
          dayOfWeek: window.dayOfWeek,
          openTime: window.openTime,
          closeTime: window.closeTime,
          isClosed: window.isClosed ?? false,
        })),
      });
    }

    return tx.providerProfile.findUnique({
      where: { id: createdProfile.id },
      include: {
        availabilityWindows: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });
  });

  return result;
};

const getMyProfile = async (userId: string) => {
  const result = await prisma.providerProfile.findUnique({
    where: { userId },
    include: {
      meals: true,
      availabilityWindows: {
        orderBy: { dayOfWeek: 'asc' },
      },
      specialClosures: {
        orderBy: { date: 'asc' },
      },
    }
  });

  if (!result) {
    throw new AppError(status.NOT_FOUND, 'Provider profile not found!');
  }
  return {
    ...result,
    ...getAvailabilityMeta(result),
  };
};

const updateMyProfile = async (userId: string, data: Partial<Prisma.ProviderProfileUpdateInput>) => {
  const profile = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(status.NOT_FOUND, 'Provider profile not found to update!');

  const payload = data as Partial<Prisma.ProviderProfileUpdateInput> & {
    availabilityWindows?: TAvailabilityWindowInput[];
  };
  const availabilityWindows = payload.availabilityWindows
    ? normalizeAvailabilityWindows(payload.availabilityWindows)
    : undefined;
  delete (payload as any).availabilityWindows;

  const result = await prisma.$transaction(async (tx) => {
    const updatedProfile = await tx.providerProfile.update({
      where: { userId },
      data: payload,
    });

    if (availabilityWindows) {
      await tx.providerAvailabilityWindow.deleteMany({ where: { providerId: updatedProfile.id } });

      if (availabilityWindows.length > 0) {
        await tx.providerAvailabilityWindow.createMany({
          data: availabilityWindows.map((window) => ({
            providerId: updatedProfile.id,
            dayOfWeek: window.dayOfWeek,
            openTime: window.openTime,
            closeTime: window.closeTime,
            isClosed: window.isClosed ?? false,
          })),
        });
      }
    }

    return tx.providerProfile.findUnique({
      where: { id: updatedProfile.id },
      include: {
        availabilityWindows: {
          orderBy: { dayOfWeek: 'asc' },
        },
        specialClosures: {
          orderBy: { date: 'asc' },
        },
      },
    });
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
        availabilityWindows: {
          orderBy: { dayOfWeek: 'asc' },
        },
        specialClosures: {
          orderBy: { date: 'asc' },
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
    data: result.map((provider) => ({
      ...provider,
      ...getAvailabilityMeta(provider),
    })),
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
      },
      availabilityWindows: {
        orderBy: { dayOfWeek: 'asc' },
      },
      specialClosures: {
        orderBy: { date: 'asc' },
      },
    }
  });

  if (!result) {
    throw new AppError(status.NOT_FOUND, 'Provider profile not found!');
  }
  return {
    ...result,
    ...getAvailabilityMeta(result),
  };
};

export const ProviderProfileServices = {
  createMyProfile,
  getMyProfile,
  getProviderById,
  updateMyProfile,
  getAllProviders,
};