import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const availabilityWindowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(timeRegex, 'openTime must be in HH:mm format'),
  closeTime: z.string().regex(timeRegex, 'closeTime must be in HH:mm format'),
  isClosed: z.boolean().optional(),
});

const createProfileZodSchema = z.object({
  body: z.object({
    restaurantName: z.string({ message: 'Restaurant name is required' }),
    description: z.string().optional(),
    address: z.string({ message: 'Address is required' }),
    cuisineType: z.string().optional(),
    preparationTimeMinutes: z.number().int().min(5).max(180).optional(),
    timezone: z.string().optional(),
    logo: z.string().optional(),
    bannerImage: z.string().optional(),
    availabilityWindows: z.array(availabilityWindowSchema).max(7).optional(),
  }),
});

const updateProfileZodSchema = z.object({
  body: z.object({
    restaurantName: z.string().optional(),
    description: z.string().optional(),
    address: z.string().optional(),
    cuisineType: z.string().optional(),
    preparationTimeMinutes: z.number().int().min(5).max(180).optional(),
    timezone: z.string().optional(),
    logo: z.string().optional(),
    bannerImage: z.string().optional(),
    availabilityWindows: z.array(availabilityWindowSchema).max(7).optional(),
  }),
});

export const ProviderProfileValidation = {
  createProfileZodSchema,
  updateProfileZodSchema,
};