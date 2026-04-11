import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { parsePaginationQuery } from '../../shared/queryParser';
import { FavoriteServices } from './favorite.service';
const getMyMealFavorites = catchAsync(async (req, res) => {
    const { userId } = req.user;
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
const getMyProviderFavorites = catchAsync(async (req, res) => {
    const { userId } = req.user;
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
const toggleMealFavorite = catchAsync(async (req, res) => {
    const { userId } = req.user;
    const result = await FavoriteServices.toggleMealFavorite(userId, req.params.mealId);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: result.favorited ? 'Meal added to favorites.' : 'Meal removed from favorites.',
        data: result,
    });
});
const toggleProviderFavorite = catchAsync(async (req, res) => {
    const { userId } = req.user;
    const result = await FavoriteServices.toggleProviderFavorite(userId, req.params.providerId);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: result.favorited ? 'Restaurant added to favorites.' : 'Restaurant removed from favorites.',
        data: result,
    });
});
const getMealFavoriteState = catchAsync(async (req, res) => {
    const { userId } = req.user;
    const result = await FavoriteServices.getFavoriteState(userId, req.params.mealId, undefined);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Meal favorite state retrieved successfully.',
        data: result,
    });
});
const getProviderFavoriteState = catchAsync(async (req, res) => {
    const { userId } = req.user;
    const result = await FavoriteServices.getFavoriteState(userId, undefined, req.params.providerId);
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
