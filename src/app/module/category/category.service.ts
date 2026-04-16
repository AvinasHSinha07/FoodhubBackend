import { Prisma } from '../../../generated/prisma';
import { prisma } from '../../lib/prisma';
import AppError from '../../errorHelpers/AppError';
import status from 'http-status';

// Helper to create slugs
const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const createCategory = async (data: Prisma.CategoryCreateInput) => {
  data.slug = generateSlug(data.name);

  // Check if category already exists
  const existingCategory = await prisma.category.findUnique({
    where: { slug: data.slug },
  });

  if (existingCategory) {
    throw new AppError(status.CONFLICT, 'Category already exists!');
  }

  const result = await prisma.category.create({ data });
  return result;
};

const getAllCategories = async (filters: { searchTerm?: string }) => {
  const { searchTerm, ...filterData } = filters;
  const conditions: Prisma.CategoryWhereInput[] = [];

  if (searchTerm) {
    conditions.push({
      OR: ['name', 'slug'].map((field) => ({
        [field]: { contains: searchTerm, mode: 'insensitive' },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    conditions.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: { equals: (filterData as any)[key] },
      })),
    });
  }

  const result = await prisma.category.findMany({
    where: conditions.length > 0 ? { AND: conditions } : {},
  });
  return result;
};

const getCategoryById = async (id: string) => {
  const result = await prisma.category.findUnique({ where: { id } });
  if (!result) throw new AppError(status.NOT_FOUND, 'Category not found!');
  return result;
};

const updateCategory = async (id: string, data: Partial<Prisma.CategoryUpdateInput>) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError(status.NOT_FOUND, 'Category not found!');

  if (data.name && typeof data.name === 'string') {
     data.slug = generateSlug(data.name);
  }

  const result = await prisma.category.update({ where: { id }, data });
  return result;
};

const deleteCategory = async (id: string) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError(status.NOT_FOUND, 'Category not found!');

  const result = await prisma.category.delete({ where: { id } });
  return result;
};

export const CategoryServices = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};