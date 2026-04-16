import { CouponDiscountType, PaymentMethod, PaymentStatus } from '../../../generated/prisma';
import { prisma } from '../../lib/prisma';
import AppError from '../../errorHelpers/AppError';
import status from 'http-status';
import { buildPaginationMeta } from '../../shared/queryParser';
const normalizeOrderItems = (data) => {
    if (Array.isArray(data?.orderItems)) {
        return data.orderItems;
    }
    if (Array.isArray(data?.items)) {
        return data.items;
    }
    return [];
};
const normalizeOrderData = (data) => ({
    providerId: data.providerId,
    deliveryAddress: data.deliveryAddress,
    addressId: data.addressId,
    paymentMethod: data.paymentMethod || 'STRIPE',
    couponCode: typeof data.couponCode === 'string' ? data.couponCode.trim().toUpperCase() : undefined,
    items: normalizeOrderItems(data),
});
const formatAddress = (address) => {
    const segments = [
        address.line1,
        address.line2,
        [address.city, address.state].filter(Boolean).join(', '),
        [address.postalCode, address.country].filter(Boolean).join(' '),
    ].filter(Boolean);
    if (address.instructions) {
        segments.push(`Instructions: ${address.instructions}`);
    }
    return `${address.label}: ${segments.join(', ')}`;
};
const getLocalDateContext = (timezone) => {
    let formatter;
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
    }
    catch {
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
    const dayMap = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
    };
    return {
        dayOfWeek: dayMap[partMap.weekday] ?? 0,
        currentMinutes: Number(partMap.hour || '0') * 60 + Number(partMap.minute || '0'),
        dateKey: `${partMap.year}-${partMap.month}-${partMap.day}`,
    };
};
const toMinutes = (value) => {
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
};
const assertProviderIsOpenForOrders = async (providerId) => {
    const provider = await prisma.providerProfile.findUnique({
        where: { id: providerId },
        select: {
            id: true,
            timezone: true,
            availabilityWindows: {
                orderBy: { dayOfWeek: 'asc' },
            },
            specialClosures: {
                select: { date: true },
            },
        },
    });
    if (!provider) {
        throw new AppError(status.NOT_FOUND, 'Provider not found!');
    }
    if (provider.availabilityWindows.length === 0) {
        return;
    }
    const context = getLocalDateContext(provider.timezone || 'UTC');
    const todaysWindow = provider.availabilityWindows.find((window) => window.dayOfWeek === context.dayOfWeek);
    const isTodaySpeciallyClosed = provider.specialClosures.some((closure) => closure.date.toISOString().slice(0, 10) === context.dateKey);
    if (!todaysWindow || todaysWindow.isClosed || isTodaySpeciallyClosed) {
        throw new AppError(status.BAD_REQUEST, 'Restaurant is currently closed. Please order during open hours.');
    }
    const openMinutes = toMinutes(todaysWindow.openTime);
    const closeMinutes = toMinutes(todaysWindow.closeTime);
    const isOpen = closeMinutes > openMinutes
        ? context.currentMinutes >= openMinutes && context.currentMinutes < closeMinutes
        : context.currentMinutes >= openMinutes || context.currentMinutes < closeMinutes;
    if (!isOpen) {
        throw new AppError(status.BAD_REQUEST, 'Restaurant is currently closed. Please order during open hours.');
    }
};
const prepareOrderItems = async (providerId, orderItems) => {
    const mealIds = orderItems.map((item) => item.mealId);
    const meals = await prisma.meal.findMany({
        where: {
            id: { in: mealIds },
        },
        select: {
            id: true,
            providerId: true,
            isAvailable: true,
            price: true,
        },
    });
    const mealById = new Map(meals.map((meal) => [meal.id, meal]));
    let subtotalPrice = 0;
    const processedOrderItems = [];
    for (const item of orderItems) {
        const meal = mealById.get(item.mealId);
        if (!meal) {
            throw new AppError(status.NOT_FOUND, `Meal with ID ${item.mealId} not found.`);
        }
        if (meal.providerId !== providerId) {
            throw new AppError(status.BAD_REQUEST, `Meal with ID ${item.mealId} does not belong to the selected provider.`);
        }
        if (!meal.isAvailable) {
            throw new AppError(status.BAD_REQUEST, `Meal with ID ${item.mealId} is currently unavailable.`);
        }
        const itemTotalPrice = meal.price * item.quantity;
        subtotalPrice += itemTotalPrice;
        processedOrderItems.push({
            mealId: item.mealId,
            quantity: item.quantity,
            unitPrice: meal.price,
            totalPrice: itemTotalPrice,
        });
    }
    return {
        subtotalPrice,
        processedOrderItems,
    };
};
const getCouponDiscountAmount = (coupon, subtotalPrice) => {
    if (coupon.discountType === CouponDiscountType.PERCENTAGE) {
        const rawAmount = (subtotalPrice * coupon.discountValue) / 100;
        return coupon.maxDiscountAmount ? Math.min(rawAmount, coupon.maxDiscountAmount) : rawAmount;
    }
    return coupon.maxDiscountAmount
        ? Math.min(coupon.discountValue, coupon.maxDiscountAmount, subtotalPrice)
        : Math.min(coupon.discountValue, subtotalPrice);
};
const validateCouponForOrder = async (tx, customerId, providerId, subtotalPrice, couponCode) => {
    if (!couponCode) {
        return {
            coupon: null,
            discountAmount: 0,
        };
    }
    const coupon = await tx.coupon.findUnique({ where: { code: couponCode } });
    if (!coupon) {
        throw new AppError(status.NOT_FOUND, 'Coupon code not found.');
    }
    const now = new Date();
    if (!coupon.isActive) {
        throw new AppError(status.BAD_REQUEST, 'Coupon is inactive.');
    }
    if (coupon.startsAt && coupon.startsAt > now) {
        throw new AppError(status.BAD_REQUEST, 'Coupon is not active yet.');
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
        throw new AppError(status.BAD_REQUEST, 'Coupon has expired.');
    }
    if (coupon.providerId && coupon.providerId !== providerId) {
        throw new AppError(status.BAD_REQUEST, 'Coupon is not valid for this restaurant.');
    }
    if (coupon.minOrderAmount && subtotalPrice < coupon.minOrderAmount) {
        throw new AppError(status.BAD_REQUEST, `Minimum order amount for this coupon is ${coupon.minOrderAmount.toFixed(2)}.`);
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
        throw new AppError(status.BAD_REQUEST, 'Coupon usage limit has been reached.');
    }
    const customerRedemptionCount = await tx.couponRedemption.count({
        where: {
            couponId: coupon.id,
            customerId,
        },
    });
    if (customerRedemptionCount >= coupon.perUserLimit) {
        throw new AppError(status.BAD_REQUEST, 'You have already reached this coupon usage limit.');
    }
    const discountAmount = Number(getCouponDiscountAmount(coupon, subtotalPrice).toFixed(2));
    if (discountAmount <= 0) {
        throw new AppError(status.BAD_REQUEST, 'Coupon did not produce a valid discount for this order.');
    }
    return {
        coupon,
        discountAmount,
    };
};
const resolveDeliveryAddress = async (customerId, payload) => {
    if (payload.deliveryAddress && payload.deliveryAddress.trim()) {
        return payload.deliveryAddress.trim();
    }
    if (!payload.addressId) {
        throw new AppError(status.BAD_REQUEST, 'Delivery address is required.');
    }
    const address = await prisma.customerAddress.findUnique({ where: { id: payload.addressId } });
    if (!address || address.customerId !== customerId) {
        throw new AppError(status.NOT_FOUND, 'Saved address not found.');
    }
    return formatAddress(address);
};
const ALLOWED_ORDER_STATUS_TRANSITIONS = {
    PLACED: ['PREPARING', 'CANCELLED'],
    PREPARING: ['READY', 'CANCELLED'],
    READY: ['DELIVERED', 'CANCELLED'],
    DELIVERED: [],
    CANCELLED: [],
};
const createOrder = async (userId, data) => {
    const normalizedData = normalizeOrderData(data);
    const { providerId, paymentMethod, couponCode, items } = normalizedData;
    const deliveryAddress = await resolveDeliveryAddress(userId, normalizedData);
    if (items.length === 0) {
        throw new AppError(status.BAD_REQUEST, 'Order must contain at least one item.');
    }
    await assertProviderIsOpenForOrders(providerId);
    const { subtotalPrice, processedOrderItems } = await prepareOrderItems(providerId, items);
    // Create Order in Transaction
    const newOrder = await prisma.$transaction(async (tx) => {
        const couponMeta = await validateCouponForOrder(tx, userId, providerId, subtotalPrice, couponCode);
        const discountAmount = couponMeta.discountAmount;
        const totalPrice = Number(Math.max(0, subtotalPrice - discountAmount).toFixed(2));
        const order = await tx.order.create({
            data: {
                customerId: userId,
                providerId,
                couponId: couponMeta.coupon?.id,
                subtotalPrice,
                discountAmount,
                deliveryAddress,
                totalPrice,
                paymentMethod,
                paymentStatus: paymentMethod === PaymentMethod.COD ? PaymentStatus.COD_PENDING : PaymentStatus.PENDING,
                orderItems: {
                    createMany: {
                        data: processedOrderItems,
                    },
                },
            },
            include: {
                orderItems: true,
                coupon: true,
            },
        });
        if (couponMeta.coupon) {
            await tx.coupon.update({
                where: { id: couponMeta.coupon.id },
                data: {
                    usedCount: { increment: 1 },
                },
            });
            await tx.couponRedemption.create({
                data: {
                    couponId: couponMeta.coupon.id,
                    orderId: order.id,
                    customerId: userId,
                    discountAmount,
                },
            });
        }
        return order;
    });
    return newOrder;
};
const previewCoupon = async (userId, data) => {
    const normalizedData = normalizeOrderData(data);
    if (!normalizedData.couponCode) {
        throw new AppError(status.BAD_REQUEST, 'Coupon code is required.');
    }
    if (normalizedData.items.length === 0) {
        throw new AppError(status.BAD_REQUEST, 'Order must contain at least one item.');
    }
    const { subtotalPrice } = await prepareOrderItems(normalizedData.providerId, normalizedData.items);
    const result = await prisma.$transaction(async (tx) => {
        const couponMeta = await validateCouponForOrder(tx, userId, normalizedData.providerId, subtotalPrice, normalizedData.couponCode);
        const totalPrice = Number(Math.max(0, subtotalPrice - couponMeta.discountAmount).toFixed(2));
        return {
            subtotalPrice,
            discountAmount: couponMeta.discountAmount,
            totalPrice,
            coupon: couponMeta.coupon
                ? {
                    id: couponMeta.coupon.id,
                    code: couponMeta.coupon.code,
                    description: couponMeta.coupon.description,
                    discountType: couponMeta.coupon.discountType,
                    discountValue: couponMeta.coupon.discountValue,
                }
                : null,
        };
    });
    return result;
};
const getMyOrders = async (userId, role, queryOptions, filters) => {
    // If CUSTOMER, get orders placed by them.
    // If PROVIDER, get orders placed for their associated provider profile.
    const { skip, limit, sortBy, sortOrder, page } = queryOptions;
    const { orderStatus, paymentStatus } = filters;
    let whereClause = {};
    if (role === 'CUSTOMER') {
        whereClause = { customerId: userId };
    }
    else if (role === 'PROVIDER') {
        const providerProfile = await prisma.providerProfile.findUnique({ where: { userId } });
        if (!providerProfile)
            throw new AppError(status.NOT_FOUND, 'Provider Profile missing.');
        whereClause = { providerId: providerProfile.id };
    }
    else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        whereClause = {}; // Admin sees all
    }
    if (orderStatus) {
        whereClause = {
            ...whereClause,
            orderStatus: orderStatus,
        };
    }
    if (paymentStatus) {
        whereClause = {
            ...whereClause,
            paymentStatus: paymentStatus,
        };
    }
    const [result, total] = await prisma.$transaction([
        prisma.order.findMany({
            where: whereClause,
            include: {
                orderItems: {
                    include: {
                        meal: {
                            select: { title: true, price: true, image: true, providerId: true }
                        }
                    }
                },
                customer: { select: { name: true, email: true } },
                provider: { select: { id: true, restaurantName: true, logo: true, bannerImage: true, address: true } },
                coupon: {
                    select: {
                        id: true,
                        code: true,
                        discountType: true,
                        discountValue: true,
                    },
                },
            },
            skip,
            take: limit,
            orderBy: {
                [sortBy]: sortOrder,
            },
        }),
        prisma.order.count({ where: whereClause }),
    ]);
    return {
        meta: buildPaginationMeta(page, limit, total),
        data: result,
    };
};
const getOrderById = async (id, userId, role) => {
    const result = await prisma.order.findUnique({
        where: { id },
        include: {
            orderItems: {
                include: { meal: { select: { title: true } } }
            },
            customer: { select: { name: true, email: true } },
            provider: { select: { restaurantName: true, userId: true } },
            coupon: {
                select: {
                    id: true,
                    code: true,
                    discountType: true,
                    discountValue: true,
                },
            },
        }
    });
    if (!result)
        throw new AppError(status.NOT_FOUND, 'Order not found!');
    // Authorization Check
    if (role === 'CUSTOMER' && result.customerId !== userId) {
        throw new AppError(status.FORBIDDEN, 'You cannot access this order.');
    }
    if (role === 'PROVIDER' && result.provider.userId !== userId) {
        throw new AppError(status.FORBIDDEN, 'You cannot access this order.');
    }
    return result;
};
const updateOrderStatus = async (id, userId, updateStatus) => {
    const order = await prisma.order.findUnique({
        where: { id },
        include: { provider: true }
    });
    if (!order)
        throw new AppError(status.NOT_FOUND, 'Order not found!');
    // Only the Provider of the order can update the status
    if (order.provider.userId !== userId) {
        throw new AppError(status.FORBIDDEN, 'Only the designated provider can update the order status!');
    }
    const currentStatus = order.orderStatus;
    const allowedNextStatuses = ALLOWED_ORDER_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedNextStatuses.includes(updateStatus)) {
        throw new AppError(status.BAD_REQUEST, `Invalid status transition from ${currentStatus} to ${updateStatus}.`);
    }
    const result = await prisma.order.update({
        where: { id },
        data: { orderStatus: updateStatus },
    });
    return result;
};
const reorderFromPrevious = async (userId, orderId) => {
    const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            orderItems: {
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
            },
            provider: true,
        },
    });
    if (!existingOrder) {
        throw new AppError(status.NOT_FOUND, 'Order not found!');
    }
    if (existingOrder.customerId !== userId) {
        throw new AppError(status.FORBIDDEN, 'You cannot reorder someone else\'s order.');
    }
    if (existingOrder.orderItems.length === 0) {
        throw new AppError(status.BAD_REQUEST, 'This order has no items to reorder.');
    }
    const unavailableMeals = existingOrder.orderItems
        .filter((item) => !item.meal || !item.meal.isAvailable)
        .map((item) => item.meal?.title || item.mealId);
    if (unavailableMeals.length > 0) {
        throw new AppError(status.BAD_REQUEST, `Some meals are no longer available: ${unavailableMeals.join(', ')}`);
    }
    return {
        provider: existingOrder.provider,
        deliveryAddress: existingOrder.deliveryAddress,
        items: existingOrder.orderItems.map((item) => ({
            mealId: item.mealId,
            quantity: item.quantity,
            meal: item.meal,
        })),
    };
};
export const OrderServices = {
    createOrder,
    previewCoupon,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
    reorderFromPrevious,
};
