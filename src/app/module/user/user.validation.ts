import { z } from 'zod';

const updateProfileZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    image: z.string().url().optional(),
  }),
});

const updateUserStatusZodSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'BLOCKED']),
  }),
});

export const UserValidation = {
  updateProfileZodSchema,
  updateUserStatusZodSchema,
};