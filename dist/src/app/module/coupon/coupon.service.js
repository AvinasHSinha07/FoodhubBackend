import status from 'http-status';
import AppError from '../../errorHelpers/AppError';
import { prisma } from '../../lib/prisma';
import { buildPaginationMeta } from '../../shared/queryParser';
const normalizeCouponCode = (code) => code.trim().toUpperCase();
const createCoupon = async (payload) => {
    const code = normalizeCouponCode(payload.code);
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) {
        throw new AppError(status.CONFLICT, 'Coupon code already exists.');
    }
    return prisma.coupon.create({
        data: {
            ...payload,
            code,
        },
    });
};
const getAllCoupons = async (queryOptions, filters) => {
    const { skip, limit, page, sortBy, sortOrder, searchTerm } = queryOptions;
    const conditions = [];
    if (searchTerm) {
        conditions.push({
            OR: [
                { code: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } },
            ],
        });
    }
    if (typeof filters.isActive === 'string') {
        if (filters.isActive === 'true') {
            conditions.push({ isActive: true });
        }
        if (filters.isActive === 'false') {
            conditions.push({ isActive: false });
        }
    }
    if (filters.providerId) {
        conditions.push({ providerId: filters.providerId });
    }
    const where = conditions.length > 0 ? { AND: conditions } : {};
    const [data, total] = await prisma.$transaction([
        prisma.coupon.findMany({
            where,
            include: {
                provider: {
                    select: {
                        id: true,
                        restaurantName: true,
                    },
                },
            },
            skip,
            take: limit,
            orderBy: {
                [sortBy]: sortOrder,
            },
        }),
        prisma.coupon.count({ where }),
    ]);
    return {
        data,
        meta: buildPaginationMeta(page, limit, total),
    };
};
const updateCoupon = async (couponId, payload) => {
    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) {
        throw new AppError(status.NOT_FOUND, 'Coupon not found.');
    }
    let normalizedCode;
    if (typeof payload.code === 'string') {
        normalizedCode = normalizeCouponCode(payload.code);
        const existingByCode = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
        if (existingByCode && existingByCode.id !== couponId) {
            throw new AppError(status.CONFLICT, 'Coupon code already exists.');
        }
    }
    return prisma.coupon.update({
        where: { id: couponId },
        data: {
            ...payload,
            ...(normalizedCode ? { code: normalizedCode } : {}),
        },
    });
};
const deleteCoupon = async (couponId) => {
    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) {
        throw new AppError(status.NOT_FOUND, 'Coupon not found.');
    }
    const redemptionCount = await prisma.couponRedemption.count({ where: { couponId } });
    if (redemptionCount > 0) {
        throw new AppError(status.BAD_REQUEST, 'Coupon with redemptions cannot be deleted. Deactivate it instead.');
    }
    return prisma.coupon.delete({ where: { id: couponId } });
};
export const CouponServices = {
    createCoupon,
    getAllCoupons,
    updateCoupon,
    deleteCoupon,
};
