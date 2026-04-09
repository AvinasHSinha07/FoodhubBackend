import { z } from 'zod';

const createReviewZodSchema = z.object({
  body: z.object({
    mealId: z.string({ message: 'Meal ID is required' }),
    rating: z.number({ message: 'Rating is required' }).int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot be more than 5'),
    comment: z.string().optional(),
  }),
});

export const ReviewValidation = {
  createReviewZodSchema,
};