import { prisma } from '../../lib/prisma';
import AppError from '../../errorHelpers/AppError';
import status from 'http-status';
const createReview = async (userId, data) => {
    // Check if meal exists
    const meal = await prisma.meal.findUnique({
        where: { id: data.mealId },
    });
    if (!meal) {
        throw new AppError(status.NOT_FOUND, 'Meal not found!');
    }
    // Check if the user has ordered the meal before they can review it
    const hasOrdered = await prisma.orderItem.findFirst({
        where: {
            mealId: data.mealId,
            order: {
                customerId: userId,
                orderStatus: 'DELIVERED', // Must explicitly be delivered
            },
        },
    });
    if (!hasOrdered) {
        throw new AppError(status.FORBIDDEN, 'You can only review meals you have successfully ordered and received.');
    }
    // Check if user already reviewed this meal
    const existingReview = await prisma.review.findFirst({
        where: {
            customerId: userId,
            mealId: data.mealId,
        },
    });
    if (existingReview) {
        throw new AppError(status.CONFLICT, 'You have already reviewed this meal!');
    }
    // Exclude orderId if it was passed from the frontend since it's not in the Review schema
    const { orderId, ...reviewData } = data;
    reviewData.customerId = userId;
    try {
        const result = await prisma.review.create({
            data: reviewData,
            include: {
                customer: {
                    select: {
                        name: true,
                        image: true,
                    },
                },
                meal: {
                    select: {
                        title: true,
                    },
                },
            },
        });
        return result;
    }
    catch (error) {
        if (error?.code === 'P2002') {
            throw new AppError(status.CONFLICT, 'You have already reviewed this meal!');
        }
        throw error;
    }
};
const getReviewsByMeal = async (mealId) => {
    const result = await prisma.review.findMany({
        where: { mealId },
        include: {
            customer: {
                select: {
                    name: true,
                    image: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    return result;
};
const deleteReview = async (id, userId, role) => {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
        throw new AppError(status.NOT_FOUND, 'Review not found!');
    }
    if (role !== 'ADMIN' && review.customerId !== userId) {
        throw new AppError(status.FORBIDDEN, 'You are not authorized to delete this review.');
    }
    const result = await prisma.review.delete({
        where: { id },
    });
    return result;
};
export const ReviewServices = {
    createReview,
    getReviewsByMeal,
    deleteReview,
};
