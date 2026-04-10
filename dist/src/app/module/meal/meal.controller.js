import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { MealServices } from './meal.service';
const createMeal = catchAsync(async (req, res) => {
    const { userId } = req.user;
    const result = await MealServices.createMeal(userId, req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: 'Meal created successfully!',
        data: result,
    });
});
const getAllMeals = catchAsync(async (req, res) => {
    const filters = {
        searchTerm: req.query.searchTerm,
        categoryId: req.query.categoryId,
        providerId: req.query.providerId,
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
const getMealById = catchAsync(async (req, res) => {
    const result = await MealServices.getMealById(req.params.id);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Meal retrieved successfully!',
        data: result,
    });
});
const updateMeal = catchAsync(async (req, res) => {
    const { userId } = req.user;
    // If patching the categoryId properly map it for Prisma updates
    const updateData = { ...req.body };
    if (updateData.categoryId) {
        updateData.category = { connect: { id: updateData.categoryId } };
        delete updateData.categoryId;
    }
    const result = await MealServices.updateMeal(req.params.id, userId, updateData);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Meal updated successfully!',
        data: result,
    });
});
const deleteMeal = catchAsync(async (req, res) => {
    const { userId } = req.user;
    const result = await MealServices.deleteMeal(req.params.id, userId);
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
