import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { ReviewServices } from './review.service';
const createReview = catchAsync(async (req, res) => {
    const { userId } = req.user;
    const result = await ReviewServices.createReview(userId, req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: 'Review created successfully!',
        data: result,
    });
});
const getReviewsByMeal = catchAsync(async (req, res) => {
    const result = await ReviewServices.getReviewsByMeal(req.params.mealId);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Reviews retrieved successfully!',
        data: result,
    });
});
const deleteReview = catchAsync(async (req, res) => {
    const { userId, role } = req.user;
    const result = await ReviewServices.deleteReview(req.params.id, userId, role);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Review deleted successfully!',
        data: result,
    });
});
export const ReviewController = {
    createReview,
    getReviewsByMeal,
    deleteReview,
};
