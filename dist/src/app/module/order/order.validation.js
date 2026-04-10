import { z } from 'zod';
const createOrderZodSchema = z.object({
    body: z.object({
        providerId: z.string({ message: 'Provider ID is required' }),
        deliveryAddress: z.string({ message: 'Delivery Address is required' }),
        orderItems: z.array(z.object({
            mealId: z.string({ message: 'Meal ID is required' }),
            quantity: z.number().int().min(1, 'Quantity must be at least 1'),
        })).min(1, 'Order must contain at least one item'),
    }),
});
const updateOrderStatusZodSchema = z.object({
    body: z.object({
        status: z.enum(['PLACED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']),
    }),
});
export const OrderValidation = {
    createOrderZodSchema,
    updateOrderStatusZodSchema,
};
