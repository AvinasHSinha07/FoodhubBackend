import { z } from 'zod';

const orderItemSchema = z.object({
  mealId: z.string({ message: 'Meal ID is required' }),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

const createOrderZodSchema = z.object({
  body: z.object({
    providerId: z.string({ message: 'Provider ID is required' }),
    deliveryAddress: z.string({ message: 'Delivery Address is required' }),
    // Keep backward compatibility with frontend payload naming.
    orderItems: z.array(orderItemSchema).optional(),
    items: z.array(orderItemSchema).optional(),
  }).refine(
    (data) => {
      const normalizedItems = data.orderItems || data.items || [];
      return normalizedItems.length > 0;
    },
    {
      message: 'Order must contain at least one item',
      path: ['orderItems'],
    }
  ),
});

const updateOrderStatusZodSchema = z.object({
  body: z.object({
    status: z.enum(['PLACED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']).optional(),
    orderStatus: z.enum(['PLACED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']).optional(),
  }).refine(
    (data) => Boolean(data.status || data.orderStatus),
    {
      message: 'Order status is required',
      path: ['status'],
    }
  ),
});

export const OrderValidation = {
  createOrderZodSchema,
  updateOrderStatusZodSchema,
};