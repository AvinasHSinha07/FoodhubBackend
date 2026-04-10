import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { CategoryServices } from './category.service';
const createCategory = catchAsync(async (req, res) => {
    const result = await CategoryServices.createCategory(req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Category created successfully!',
        data: result,
    });
});
const getAllCategories = catchAsync(async (req, res) => {
    const filters = {
        searchTerm: req.query.searchTerm,
    };
    Object.keys(filters).forEach((key) => filters[key] === undefined && delete filters[key]);
    const result = await CategoryServices.getAllCategories(filters);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Categories retrieved successfully!',
        data: result,
    });
});
const getCategoryById = catchAsync(async (req, res) => {
    const result = await CategoryServices.getCategoryById(req.params.id);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Category retrieved successfully!',
        data: result,
    });
});
const updateCategory = catchAsync(async (req, res) => {
    const result = await CategoryServices.updateCategory(req.params.id, req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Category updated successfully!',
        data: result,
    });
});
const deleteCategory = catchAsync(async (req, res) => {
    const result = await CategoryServices.deleteCategory(req.params.id);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Category deleted successfully!',
        data: result,
    });
});
export const CategoryController = {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
};
