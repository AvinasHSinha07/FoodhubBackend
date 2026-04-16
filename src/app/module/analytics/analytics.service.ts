import { PaymentMethod, PaymentStatus } from '../../../generated/prisma';
import status from 'http-status';
import AppError from '../../errorHelpers/AppError';
import { prisma } from '../../lib/prisma';

const getRangeStartDate = (days: number) => {
  const safeDays = Number.isFinite(days) && days > 0 ? Math.min(Math.floor(days), 365) : 30;
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (safeDays - 1));
  return date;
};

const toDateKey = (value: Date) => value.toISOString().slice(0, 10);

const buildDateBuckets = (startDate: Date, endDate: Date) => {
  const buckets: string[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    buckets.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
};

const computeRevenue = (orders: Array<{ totalPrice: number; paymentStatus: PaymentStatus }>) => {
  return orders
    .filter(
      (order) =>
        order.paymentStatus === PaymentStatus.PAID ||
        order.paymentStatus === PaymentStatus.COD_COLLECTED
    )
    .reduce((sum, order) => sum + order.totalPrice, 0);
};

const getAdminOverviewAnalytics = async (days: number) => {
  const startDate = getRangeStartDate(days);
  const endDate = new Date();

  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      id: true,
      createdAt: true,
      totalPrice: true,
      paymentMethod: true,
      paymentStatus: true,
      orderStatus: true,
      provider: {
        select: {
          id: true,
          restaurantName: true,
        },
      },
    },
  });

  const ordersByDayMap = new Map<string, { orders: number; revenue: number }>();
  buildDateBuckets(startDate, endDate).forEach((dateKey) => {
    ordersByDayMap.set(dateKey, { orders: 0, revenue: 0 });
  });

  const providerPerformanceMap = new Map<
    string,
    { providerId: string; restaurantName: string; orders: number; revenue: number }
  >();

  orders.forEach((order) => {
    const dateKey = toDateKey(order.createdAt);
    const existing = ordersByDayMap.get(dateKey);

    if (existing) {
      existing.orders += 1;
      if (
        order.paymentStatus === PaymentStatus.PAID ||
        order.paymentStatus === PaymentStatus.COD_COLLECTED
      ) {
        existing.revenue += order.totalPrice;
      }
    }

    const providerStats = providerPerformanceMap.get(order.provider.id) || {
      providerId: order.provider.id,
      restaurantName: order.provider.restaurantName,
      orders: 0,
      revenue: 0,
    };

    providerStats.orders += 1;
    if (
      order.paymentStatus === PaymentStatus.PAID ||
      order.paymentStatus === PaymentStatus.COD_COLLECTED
    ) {
      providerStats.revenue += order.totalPrice;
    }

    providerPerformanceMap.set(order.provider.id, providerStats);
  });

  const paymentMethodBreakdown = Object.values(PaymentMethod).map((method) => ({
    method,
    count: orders.filter((order) => order.paymentMethod === method).length,
  }));

  const paymentStatusBreakdown = Object.values(PaymentStatus).map((paymentStatus) => ({
    paymentStatus,
    count: orders.filter((order) => order.paymentStatus === paymentStatus).length,
  }));

  const orderStatusBreakdownMap = new Map<string, number>();
  orders.forEach((order) => {
    orderStatusBreakdownMap.set(order.orderStatus, (orderStatusBreakdownMap.get(order.orderStatus) || 0) + 1);
  });

  const totalRevenue = computeRevenue(orders);

  return {
    summary: {
      totalOrders: orders.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      paidOrders: orders.filter((order) =>
        order.paymentStatus === PaymentStatus.PAID ||
        order.paymentStatus === PaymentStatus.COD_COLLECTED
      ).length,
      pendingPayments: orders.filter((order) =>
        order.paymentStatus === PaymentStatus.PENDING ||
        order.paymentStatus === PaymentStatus.COD_PENDING
      ).length,
    },
    ordersByDay: Array.from(ordersByDayMap.entries()).map(([date, value]) => ({
      date,
      orders: value.orders,
      revenue: Number(value.revenue.toFixed(2)),
    })),
    paymentMethodBreakdown,
    paymentStatusBreakdown,
    orderStatusBreakdown: Array.from(orderStatusBreakdownMap.entries()).map(([orderStatus, count]) => ({
      orderStatus,
      count,
    })),
    topProviders: Array.from(providerPerformanceMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((entry) => ({
        ...entry,
        revenue: Number(entry.revenue.toFixed(2)),
      })),
  };
};

const getProviderOverviewAnalytics = async (providerUserId: string, days: number) => {
  const provider = await prisma.providerProfile.findUnique({
    where: { userId: providerUserId },
    select: {
      id: true,
      restaurantName: true,
    },
  });

  if (!provider) {
    throw new AppError(status.NOT_FOUND, 'Provider profile not found.');
  }

  const startDate = getRangeStartDate(days);
  const endDate = new Date();

  const orders = await prisma.order.findMany({
    where: {
      providerId: provider.id,
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      id: true,
      createdAt: true,
      totalPrice: true,
      paymentMethod: true,
      paymentStatus: true,
      orderStatus: true,
      orderItems: {
        select: {
          mealId: true,
          quantity: true,
          totalPrice: true,
          meal: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  const ordersByDayMap = new Map<string, { orders: number; revenue: number }>();
  buildDateBuckets(startDate, endDate).forEach((dateKey) => {
    ordersByDayMap.set(dateKey, { orders: 0, revenue: 0 });
  });

  const topMealsMap = new Map<string, { mealId: string; title: string; quantity: number; revenue: number }>();

  orders.forEach((order) => {
    const dateKey = toDateKey(order.createdAt);
    const existing = ordersByDayMap.get(dateKey);

    if (existing) {
      existing.orders += 1;
      if (
        order.paymentStatus === PaymentStatus.PAID ||
        order.paymentStatus === PaymentStatus.COD_COLLECTED
      ) {
        existing.revenue += order.totalPrice;
      }
    }

    order.orderItems.forEach((item) => {
      const existingMeal = topMealsMap.get(item.mealId) || {
        mealId: item.mealId,
        title: item.meal?.title || 'Meal',
        quantity: 0,
        revenue: 0,
      };

      existingMeal.quantity += item.quantity;
      existingMeal.revenue += item.totalPrice;

      topMealsMap.set(item.mealId, existingMeal);
    });
  });

  const paymentStatusBreakdown = Object.values(PaymentStatus).map((paymentStatus) => ({
    paymentStatus,
    count: orders.filter((order) => order.paymentStatus === paymentStatus).length,
  }));

  const totalRevenue = computeRevenue(orders);

  return {
    provider,
    summary: {
      totalOrders: orders.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      paidOrders: orders.filter((order) =>
        order.paymentStatus === PaymentStatus.PAID ||
        order.paymentStatus === PaymentStatus.COD_COLLECTED
      ).length,
      pendingPayments: orders.filter((order) =>
        order.paymentStatus === PaymentStatus.PENDING ||
        order.paymentStatus === PaymentStatus.COD_PENDING
      ).length,
    },
    ordersByDay: Array.from(ordersByDayMap.entries()).map(([date, value]) => ({
      date,
      orders: value.orders,
      revenue: Number(value.revenue.toFixed(2)),
    })),
    paymentStatusBreakdown,
    paymentMethodBreakdown: Object.values(PaymentMethod).map((method) => ({
      method,
      count: orders.filter((order) => order.paymentMethod === method).length,
    })),
    topMeals: Array.from(topMealsMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
      .map((entry) => ({
        ...entry,
        revenue: Number(entry.revenue.toFixed(2)),
      })),
  };
};

export const AnalyticsServices = {
  getAdminOverviewAnalytics,
  getProviderOverviewAnalytics,
};
