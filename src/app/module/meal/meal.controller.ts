import { Request, Response } from 'express';
import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { MealServices } from './meal.service';
import { parsePaginationQuery } from '../../shared/queryParser';

const createMeal = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as any;
  const result = await MealServices.createMeal(userId, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: 'Meal created successfully!',
    data: result,
  });
});

const getAllMeals = catchAsync(async (req: Request, res: Response) => {
  const queryOptions = parsePaginationQuery(req.query, {
    allowedSortBy: ['createdAt', 'price', 'title', 'updatedAt'],
    allowedFilterKeys: ['categoryId', 'providerId', 'minPrice', 'maxPrice', 'dietaryTag', 'isAvailable'],
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    defaultLimit: 12,
  });

  const result = await MealServices.getAllMeals(queryOptions, {
    categoryId: queryOptions.filters.categoryId,
    providerId: queryOptions.filters.providerId,
    minPrice: queryOptions.filters.minPrice ? Number(queryOptions.filters.minPrice) : undefined,
    maxPrice: queryOptions.filters.maxPrice ? Number(queryOptions.filters.maxPrice) : undefined,
    dietaryTag: queryOptions.filters.dietaryTag,
    isAvailable:
      queryOptions.filters.isAvailable === 'true'
        ? true
        : queryOptions.filters.isAvailable === 'false'
        ? false
        : undefined,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Meals retrieved successfully!',
    data: result.data,
    meta: result.meta,
  });
});

const getMealById = catchAsync(async (req: Request, res: Response) => {
  const result = await MealServices.getMealById(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Meal retrieved successfully!',
    data: result,
  });
});

const updateMeal = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as any;
  // If patching the categoryId properly map it for Prisma updates
  const updateData = { ...req.body };
  if (updateData.categoryId) {
    updateData.category = { connect: { id: updateData.categoryId } };
    delete updateData.categoryId;
  }

  const result = await MealServices.updateMeal(req.params.id as string, userId, updateData);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Meal updated successfully!',
    data: result,
  });
});

const deleteMeal = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as any;
  const result = await MealServices.deleteMeal(req.params.id as string, userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Meal deleted successfully!',
    data: result,
  });
});

export const MealController = {
  createMeal,
  getAllMeals,
  getMealById,
  updateMeal,
  deleteMeal,
};