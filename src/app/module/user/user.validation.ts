import { z } from 'zod';

const updateProfileZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    image: z.string().url().optional(),
  }),
});

export const UserValidation = {
  updateProfileZodSchema,
};