import { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import AppError from '../../errorHelpers/AppError';
import status from 'http-status';

type IncomingOrderItem = {
  mealId: string;
  quantity: number;
};

const normalizeOrderItems = (data: any): IncomingOrderItem[] => {
  if (Array.isArray(data?.orderItems)) {
    return data.orderItems;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
};

const ALLOWED_ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  PLACED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

const createOrder = async (userId: string, data: any) => {
  const { providerId, deliveryAddress } = data;
  const orderItems = normalizeOrderItems(data);

  if (orderItems.length === 0) {
    throw new AppError(status.BAD_REQUEST, 'Order must contain at least one item.');
  }

  // Verify Provider
  const provider = await prisma.providerProfile.findUnique({
    where: { id: providerId },
  });
  if (!provider) throw new AppError(status.NOT_FOUND, 'Provider not found!');

  // Validate Meals and Calculate Prices
  let totalPrice = 0;
  const processedOrderItems: Prisma.OrderItemCreateManyOrderInput[] = [];

  for (const item of orderItems) {
    const meal = await prisma.meal.findUnique({ where: { id: item.mealId } });
    if (!meal) throw new AppError(status.NOT_FOUND, `Meal with ID ${item.mealId} not found.`);
    if (meal.providerId !== providerId) {
      throw new AppError(status.BAD_REQUEST, `Meal with ID ${item.mealId} does not belong to the selected provider.`);
    }
    if (!meal.isAvailable) {
      throw new AppError(status.BAD_REQUEST, `Meal with ID ${item.mealId} is currently unavailable.`);
    }

    const itemTotalPrice = meal.price * item.quantity;
    totalPrice += itemTotalPrice;

    processedOrderItems.push({
      mealId: item.mealId,
      quantity: item.quantity,
      unitPrice: meal.price,
      totalPrice: itemTotalPrice,
    });
  }

  // Create Order in Transaction
  const newOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        customerId: userId,
        providerId,
        deliveryAddress,
        totalPrice,
        orderItems: {
          createMany: {
            data: processedOrderItems,
          },
        },
      },
      include: {
        orderItems: true,
      },
    });

    return order;
  });

  return newOrder;
};

const getMyOrders = async (userId: string, role: string) => {
  // If CUSTOMER, get orders placed by them.
  // If PROVIDER, get orders placed for their associated provider profile.
  let whereClause: Prisma.OrderWhereInput = {};

  if (role === 'CUSTOMER') {
    whereClause = { customerId: userId };
  } else if (role === 'PROVIDER') {
    const providerProfile = await prisma.providerProfile.findUnique({ where: { userId } });
    if (!providerProfile) throw new AppError(status.NOT_FOUND, 'Provider Profile missing.');
    whereClause = { providerId: providerProfile.id };
  } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      whereClause = {}; // Admin sees all
  }

  const result = await prisma.order.findMany({
    where: whereClause,
    include: {
      orderItems: {
        include: {
          meal: {
            select: { title: true, price: true, image: true }
          }
        }
      },
      customer: { select: { name: true, email: true } },
      provider: { select: { restaurantName: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return result;
};

const getOrderById = async (id: string, userId: string, role: string) => {
  const result = await prisma.order.findUnique({
    where: { id },
    include: {
      orderItems: {
        include: { meal: { select: { title: true } } }
      },
      customer: { select: { name: true, email: true } },
      provider: { select: { restaurantName: true, userId: true } }
    }
  });

  if (!result) throw new AppError(status.NOT_FOUND, 'Order not found!');

  // Authorization Check
  if (role === 'CUSTOMER' && result.customerId !== userId) {
    throw new AppError(status.FORBIDDEN, 'You cannot access this order.');
  }

  if (role === 'PROVIDER' && result.provider.userId !== userId) {
    throw new AppError(status.FORBIDDEN, 'You cannot access this order.');
  }

  return result;
};

const updateOrderStatus = async (id: string, userId: string, updateStatus: OrderStatus) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { provider: true }
  });

  if (!order) throw new AppError(status.NOT_FOUND, 'Order not found!');

  // Only the Provider of the order can update the status
  if (order.provider.userId !== userId) {
    throw new AppError(status.FORBIDDEN, 'Only the designated provider can update the order status!');
  }

  const currentStatus = order.orderStatus;
  const allowedNextStatuses = ALLOWED_ORDER_STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowedNextStatuses.includes(updateStatus)) {
    throw new AppError(
      status.BAD_REQUEST,
      `Invalid status transition from ${currentStatus} to ${updateStatus}.`
    );
  }

  const result = await prisma.order.update({
    where: { id },
    data: { orderStatus: updateStatus },
  });

  return result;
};

export const OrderServices = {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
};