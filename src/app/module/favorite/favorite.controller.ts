import { Request, Response } from 'express';
import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { parsePaginationQuery } from '../../shared/queryParser';
import { FavoriteServices } from './favorite.service';

const getMyMealFavorites = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as any;
  const queryOptions = parsePaginationQuery(req.query, {
    allowedSortBy: ['createdAt'],
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    defaultLimit: 10,
  });

  const result = await FavoriteServices.getMyMealFavorites(userId, queryOptions);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Meal favorites retrieved successfully!',
    data: result.data,
    meta: result.meta,
  });
});

const getMyProviderFavorites = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as any;
  const queryOptions = parsePaginationQuery(req.query, {
    allowedSortBy: ['createdAt'],
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    defaultLimit: 10,
  });

  const result = await FavoriteServices.getMyProviderFavorites(userId, queryOptions);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Provider favorites retrieved successfully!',
    data: result.data,
    meta: result.meta,
  });
});

const toggleMealFavorite = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as any;
  const result = await FavoriteServices.toggleMealFavorite(userId, req.params.mealId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.favorited ? 'Meal added to favorites.' : 'Meal removed from favorites.',
    data: result,
  });
});

const toggleProviderFavorite = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as any;
  const result = await FavoriteServices.toggleProviderFavorite(userId, req.params.providerId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.favorited ? 'Restaurant added to favorites.' : 'Restaurant removed from favorites.',
    data: result,
  });
});

const getMealFavoriteState = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as any;
  const result = await FavoriteServices.getFavoriteState(userId, req.params.mealId as string, undefined);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Meal favorite state retrieved successfully.',
    data: result,
  });
});

const getProviderFavoriteState = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as any;
  const result = await FavoriteServices.getFavoriteState(userId, undefined, req.params.providerId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Restaurant favorite state retrieved successfully.',
    data: result,
  });
});

export const FavoriteController = {
  getMyMealFavorites,
  getMyProviderFavorites,
  toggleMealFavorite,
  toggleProviderFavorite,
  getMealFavoriteState,
  getProviderFavoriteState,
};
