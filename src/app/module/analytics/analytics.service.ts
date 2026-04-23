import { PaymentMethod, PaymentStatus } from '@prisma/client';
import status from 'http-status';
import AppError from '../../errorHelpers/AppError';
import { prisma } from '../../lib/prisma';
import { computeOrderFinancialSnapshot, isSettledPaymentStatus } from '../../utils/revenue';

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

const toMoney = (value: number) => Number(value.toFixed(2));

type TRevenueSnapshot = {
  adminGrossRevenue: number;
  adminNetRevenue: number;
  providerGrossEarning: number;
  providerNetPayout: number;
};

const resolveRevenueSnapshot = (order: {
  totalPrice: number;
  discountAmount: number;
  paymentMethod: PaymentMethod;
  platformFeeRate: number;
  platformFeeAmount: number;
  serviceFeeAmount: number;
  paymentGatewayFeeAmount: number;
  adminCouponSubsidyAmount: number;
  providerCouponShareAmount: number;
  refundCostToAdmin: number;
  refundCostToProvider: number;
  adminGrossRevenue: number;
  adminNetRevenue: number;
  providerGrossEarning: number;
  providerNetPayout: number;
  customerPaidAmount: number;
  coupon?: { providerId: string | null } | null;
}): TRevenueSnapshot => {
  const hasSnapshotData =
    order.adminGrossRevenue !== 0 ||
    order.adminNetRevenue !== 0 ||
    order.providerGrossEarning !== 0 ||
    order.providerNetPayout !== 0 ||
    order.platformFeeAmount !== 0 ||
    order.customerPaidAmount !== 0;

  if (hasSnapshotData || order.totalPrice === 0) {
    return {
      adminGrossRevenue: order.adminGrossRevenue,
      adminNetRevenue: order.adminNetRevenue,
      providerGrossEarning: order.providerGrossEarning,
      providerNetPayout: order.providerNetPayout,
    };
  }

  return computeOrderFinancialSnapshot({
    totalPrice: order.totalPrice,
    discountAmount: order.discountAmount,
    paymentMethod: order.paymentMethod,
    couponProviderId: order.coupon?.providerId,
    customerPaidAmount: order.customerPaidAmount || undefined,
    platformFeeRate: order.platformFeeRate,
    refundCostToAdmin: order.refundCostToAdmin,
    refundCostToProvider: order.refundCostToProvider,
  });
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
      discountAmount: true,
      paymentMethod: true,
      paymentStatus: true,
      orderStatus: true,
      platformFeeRate: true,
      platformFeeAmount: true,
      serviceFeeAmount: true,
      paymentGatewayFeeAmount: true,
      adminCouponSubsidyAmount: true,
      providerCouponShareAmount: true,
      refundCostToAdmin: true,
      refundCostToProvider: true,
      adminGrossRevenue: true,
      adminNetRevenue: true,
      providerGrossEarning: true,
      providerNetPayout: true,
      customerPaidAmount: true,
      coupon: {
        select: {
          providerId: true,
        },
      },
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

  let gmv = 0;
  let adminGrossRevenue = 0;
  let adminNetRevenue = 0;

  orders.forEach((order) => {
    const settled = isSettledPaymentStatus(order.paymentStatus);
    const snapshot = resolveRevenueSnapshot(order);
    const dateKey = toDateKey(order.createdAt);
    const existing = ordersByDayMap.get(dateKey);

    if (existing) {
      existing.orders += 1;
      if (settled) {
        existing.revenue += snapshot.adminNetRevenue;
      }
    }

    const providerStats = providerPerformanceMap.get(order.provider.id) || {
      providerId: order.provider.id,
      restaurantName: order.provider.restaurantName,
      orders: 0,
      revenue: 0,
    };

    providerStats.orders += 1;
    if (settled) {
      providerStats.revenue += snapshot.providerNetPayout;
      gmv += order.totalPrice;
      adminGrossRevenue += snapshot.adminGrossRevenue;
      adminNetRevenue += snapshot.adminNetRevenue;
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

  const paidOrders = orders.filter((order) => isSettledPaymentStatus(order.paymentStatus)).length;
  const pendingPayments = orders.filter((order) =>
    order.paymentStatus === PaymentStatus.PENDING || order.paymentStatus === PaymentStatus.COD_PENDING
  ).length;

  return {
    summary: {
      totalOrders: orders.length,
      totalRevenue: toMoney(adminNetRevenue),
      gmv: toMoney(gmv),
      adminGrossRevenue: toMoney(adminGrossRevenue),
      adminNetRevenue: toMoney(adminNetRevenue),
      paidOrders,
      pendingPayments,
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
      discountAmount: true,
      paymentMethod: true,
      paymentStatus: true,
      orderStatus: true,
      platformFeeRate: true,
      platformFeeAmount: true,
      serviceFeeAmount: true,
      paymentGatewayFeeAmount: true,
      adminCouponSubsidyAmount: true,
      providerCouponShareAmount: true,
      refundCostToAdmin: true,
      refundCostToProvider: true,
      adminGrossRevenue: true,
      adminNetRevenue: true,
      providerGrossEarning: true,
      providerNetPayout: true,
      customerPaidAmount: true,
      coupon: {
        select: {
          providerId: true,
        },
      },
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

  let gmv = 0;
  let providerGrossEarning = 0;
  let providerNetPayout = 0;

  orders.forEach((order) => {
    const settled = isSettledPaymentStatus(order.paymentStatus);
    const snapshot = resolveRevenueSnapshot(order);
    const dateKey = toDateKey(order.createdAt);
    const existing = ordersByDayMap.get(dateKey);

    if (existing) {
      existing.orders += 1;
      if (settled) {
        existing.revenue += snapshot.providerNetPayout;
      }
    }

    if (settled) {
      gmv += order.totalPrice;
      providerGrossEarning += snapshot.providerGrossEarning;
      providerNetPayout += snapshot.providerNetPayout;
    }

    if (!settled) {
      return;
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

  const paidOrders = orders.filter((order) => isSettledPaymentStatus(order.paymentStatus)).length;
  const pendingPayments = orders.filter((order) =>
    order.paymentStatus === PaymentStatus.PENDING || order.paymentStatus === PaymentStatus.COD_PENDING
  ).length;

  return {
    provider,
    summary: {
      totalOrders: orders.length,
      totalRevenue: toMoney(providerNetPayout),
      gmv: toMoney(gmv),
      providerGrossEarning: toMoney(providerGrossEarning),
      providerNetPayout: toMoney(providerNetPayout),
      paidOrders,
      pendingPayments,
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
