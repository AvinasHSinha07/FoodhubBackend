import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { HomeServices } from './home.service';
const getHomeSummary = catchAsync(async (req, res) => {
    const result = await HomeServices.getHomeSummary();
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Home summary retrieved successfully!',
        data: result,
    });
});
export const HomeController = {
    getHomeSummary,
};
