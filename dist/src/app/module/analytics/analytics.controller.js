import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { AnalyticsServices } from './analytics.service';
const toDays = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 30;
    }
    return Math.floor(parsed);
};
const getAdminOverview = catchAsync(async (req, res) => {
    const days = toDays(req.query.days);
    const result = await AnalyticsServices.getAdminOverviewAnalytics(days);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Admin analytics retrieved successfully!',
        data: result,
    });
});
const getProviderOverview = catchAsync(async (req, res) => {
    const days = toDays(req.query.days);
    const { userId } = req.user;
    const result = await AnalyticsServices.getProviderOverviewAnalytics(userId, days);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Provider analytics retrieved successfully!',
        data: result,
    });
});
export const AnalyticsController = {
    getAdminOverview,
    getProviderOverview,
};
