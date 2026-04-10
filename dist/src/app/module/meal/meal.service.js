import { prisma } from '../../lib/prisma';
import AppError from '../../errorHelpers/AppError';
import status from 'http-status';
const createMeal = async (userId, data) => {
    // Get provider profile using userId
    const provider = await prisma.providerProfile.findUnique({
        where: { userId },
    });
    if (!provider) {
        throw new AppError(status.FORBIDDEN, 'Provider profile not found! Please create a profile first.');
    }
    // Verify category exists
    const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
    });
    if (!category) {
        throw new AppError(status.NOT_FOUND, 'Selected category does not exist!');
    }
    data.providerId = provider.id;
    const result = await prisma.meal.create({
        data,
        include: {
            category: true,
        }
    });
    return result;
};
const getAllMeals = async (filters) => {
    const { searchTerm, categoryId, providerId, isAvailable } = filters;
    const conditions = [];
    if (searchTerm) {
        conditions.push({
            OR: ['title', 'description', 'dietaryTag'].map((field) => ({
                [field]: { contains: searchTerm, mode: 'insensitive' },
            })),
        });
    }
    if (categoryId)
        conditions.push({ categoryId });
    if (providerId)
        conditions.push({ providerId });
    if (isAvailable !== undefined)
        conditions.push({ isAvailable });
    const result = await prisma.meal.findMany({
        where: conditions.length > 0 ? { AND: conditions } : {},
        include: {
            category: true,
            provider: {
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                }
            }
        },
    });
    return result;
};
const getMealById = async (id) => {
    const result = await prisma.meal.findUnique({
        where: { id },
        include: {
            category: true,
            provider: {
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                }
            }
        }
    });
    if (!result)
        throw new AppError(status.NOT_FOUND, 'Meal not found!');
    return result;
};
const updateMeal = async (id, userId, data) => {
    const meal = await prisma.meal.findUnique({
        where: { id },
        include: { provider: true }
    });
    if (!meal)
        throw new AppError(status.NOT_FOUND, 'Meal not found!');
    // Authorization map check
    if (meal.provider.userId !== userId) {
        throw new AppError(status.FORBIDDEN, 'You are not authorized to update this meal!');
    }
    // If patching the category - verify it works
    if (data.category && data.category.connect?.id) {
        const category = await prisma.category.findUnique({
            where: { id: data.category.connect.id },
        });
        if (!category)
            throw new AppError(status.NOT_FOUND, 'Selected category does not exist!');
    }
    const result = await prisma.meal.update({
        where: { id },
        data,
        include: { category: true }
    });
    return result;
};
const deleteMeal = async (id, userId) => {
    const meal = await prisma.meal.findUnique({
        where: { id },
        include: { provider: true }
    });
    if (!meal)
        throw new AppError(status.NOT_FOUND, 'Meal not found!');
    if (meal.provider.userId !== userId) {
        throw new AppError(status.FORBIDDEN, 'You are not authorized to delete this meal!');
    }
    const result = await prisma.meal.delete({ where: { id } });
    return result;
};
export const MealServices = {
    createMeal,
    getAllMeals,
    getMealById,
    updateMeal,
    deleteMeal,
};
