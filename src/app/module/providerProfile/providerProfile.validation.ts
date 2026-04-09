import { z } from 'zod';

const createProfileZodSchema = z.object({
  body: z.object({
    restaurantName: z.string({ message: 'Restaurant name is required' }),
    description: z.string().optional(),
    address: z.string({ message: 'Address is required' }),
    cuisineType: z.string().optional(),
    logo: z.string().optional(),
    bannerImage: z.string().optional(),
  }),
});

const updateProfileZodSchema = z.object({
  body: z.object({
    restaurantName: z.string().optional(),
    description: z.string().optional(),
    address: z.string().optional(),
    cuisineType: z.string().optional(),
    logo: z.string().optional(),
    bannerImage: z.string().optional(),
  }),
});

export const ProviderProfileValidation = {
  createProfileZodSchema,
  updateProfileZodSchema,
};