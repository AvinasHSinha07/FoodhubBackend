import { z } from 'zod';
const createMealZodSchema = z.object({
    body: z.object({
        categoryId: z.string({ message: 'Category ID is required' }),
        title: z.string({ message: 'Title is required' }),
        description: z.string({ message: 'Description is required' }),
        price: z.number({ message: 'Price is required' }).min(0, 'Price must be positive'),
        image: z.string().optional(),
        isAvailable: z.boolean().optional(),
        dietaryTag: z.string().optional(),
    }),
});
const updateMealZodSchema = z.object({
    body: z.object({
        categoryId: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        price: z.number().min(0, 'Price must be positive').optional(),
        image: z.string().optional(),
        isAvailable: z.boolean().optional(),
        dietaryTag: z.string().optional(),
    }),
});
export const MealValidation = {
    createMealZodSchema,
    updateMealZodSchema,
};
