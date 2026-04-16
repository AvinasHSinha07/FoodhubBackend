import { z } from 'zod';
const commonCouponShape = {
    code: z.string({ message: 'Coupon code is required' }).min(2),
    description: z.string().optional(),
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    discountValue: z.number().positive('Discount value must be positive'),
    minOrderAmount: z.number().nonnegative().optional(),
    maxDiscountAmount: z.number().positive().optional(),
    usageLimit: z.number().int().positive().optional(),
    perUserLimit: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
    startsAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
    providerId: z.string().optional(),
};
const createCouponZodSchema = z.object({
    body: z
        .object(commonCouponShape)
        .refine((data) => {
        if (data.discountType === 'PERCENTAGE') {
            return data.discountValue <= 100;
        }
        return true;
    }, {
        message: 'Percentage discount cannot exceed 100',
        path: ['discountValue'],
    }),
});
const updateCouponZodSchema = z.object({
    body: z
        .object({
        ...commonCouponShape,
        code: commonCouponShape.code.optional(),
        discountType: commonCouponShape.discountType.optional(),
        discountValue: commonCouponShape.discountValue.optional(),
    })
        .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required',
        path: ['code'],
    }),
});
export const CouponValidation = {
    createCouponZodSchema,
    updateCouponZodSchema,
};
