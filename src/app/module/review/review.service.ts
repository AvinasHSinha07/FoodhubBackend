import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import AppError from '../../errorHelpers/AppError';
import status from 'http-status';

const createReview = async (userId: string, data: Prisma.ReviewUncheckedCreateInput) => {
  // Check if meal exists
  const meal = await prisma.meal.findUnique({
    where: { id: data.mealId as string },
  });

  if (!meal) {
    throw new AppError(status.NOT_FOUND, 'Meal not found!');
  }

  // Check if the user has ordered the meal before they can review it
  const hasOrdered = await prisma.orderItem.findFirst({
    where: {
      mealId: data.mealId as string,
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
      mealId: data.mealId as string,
    },
  });

  if (existingReview) {
    throw new AppError(status.CONFLICT, 'You have already reviewed this meal!');
  }

  data.customerId = userId;

  const result = await prisma.review.create({
    data,
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