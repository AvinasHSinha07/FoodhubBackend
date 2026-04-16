import { z } from 'zod';

const updateProfileZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    image: z.string().url().optional(),
    profileImage: z.string().url().optional(),
  }),
});

const customerAddressBaseSchema = z.object({
  label: z.string().min(2, 'Address label is required'),
  line1: z.string().min(5, 'Address line is required'),
  line2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  instructions: z.string().optional(),
  isDefault: z.boolean().optional(),
});

const createAddressZodSchema = z.object({
  body: customerAddressBaseSchema,
});

const updateAddressZodSchema = z.object({
  body: customerAddressBaseSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    {
      message: 'At least one field is required to update address',
      path: ['line1'],
    }
  ),
});

const updateUserStatusZodSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'BLOCKED']),
  }),
});

export const UserValidation = {
  updateProfileZodSchema,
  createAddressZodSchema,
  updateAddressZodSchema,
  updateUserStatusZodSchema,
};