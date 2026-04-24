import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import AppError from '../../errorHelpers/AppError';
import status from 'http-status';

const createReview = async (userId: string, data: Prisma.ReviewUncheckedCreateInput) => {
  const { orderItemId, mealId, rating, comment } = data as any;

  if (!orderItemId) {
    throw new AppError(status.BAD_REQUEST, 'Order item ID is required!');
  }

  // Check if meal exists
  const meal = await prisma.meal.findUnique({
    where: { id: mealId as string },
  });

  if (!meal) {
    throw new AppError(status.NOT_FOUND, 'Meal not found!');
  }

  // Ensure the order item belongs to the customer, matches the meal, and was delivered.
  const orderItem = await prisma.orderItem.findFirst({
    where: {
      id: orderItemId as string,
      mealId: mealId as string,
      order: {
        customerId: userId,
        orderStatus: 'DELIVERED',
      },
    },
  });

  if (!orderItem) {
    throw new AppError(status.FORBIDDEN, 'You can only review delivered meals from your own orders.');
  }

  const existingReview = await prisma.review.findUnique({
    where: {
      orderItemId: orderItemId as string,
    },
  });

  if (existingReview) {
    throw new AppError(status.CONFLICT, 'You have already reviewed this ordered item.');
  }

  try {
    const result = await prisma.review.create({
      data: {
        customerId: userId,
        mealId: mealId as string,
        orderItemId: orderItemId as string,
        rating: Number(rating),
        comment,
      },
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
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw new AppError(status.CONFLICT, 'You have already reviewed this ordered item.');
    }
    throw error;
  }
};

const getReviewsByMeal = async (mealId: string) => {
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

const deleteReview = async (id: string, userId: string, role: string) => {
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