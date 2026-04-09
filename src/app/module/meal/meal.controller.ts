import { Request, Response } from 'express';
import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { MealServices } from './meal.service';

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
  const filters: Record<string, any> = {
    searchTerm: req.query.searchTerm as string,
    categoryId: req.query.categoryId as string,
    providerId: req.query.providerId as string,
    isAvailable: req.query.isAvailable === 'true' ? true : req.query.isAvailable === 'false' ? false : undefined,
  };

  // Strip out undefined filters cleanly
  Object.keys(filters).forEach((key) => filters[key] === undefined && delete filters[key]);

  const result = await MealServices.getAllMeals(filters);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Meals retrieved successfully!',
    data: result,
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