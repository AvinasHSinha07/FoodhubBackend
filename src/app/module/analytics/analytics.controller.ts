import { Request, Response } from 'express';
import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { AnalyticsServices } from './analytics.service';

const toDays = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 30;
  }

  return Math.floor(parsed);
};

const getAdminOverview = catchAsync(async (req: Request, res: Response) => {
  const days = toDays(req.query.days);
  const result = await AnalyticsServices.getAdminOverviewAnalytics(days);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Admin analytics retrieved successfully!',
    data: result,
  });
});

const getProviderOverview = catchAsync(async (req: Request, res: Response) => {
  const days = toDays(req.query.days);
  const { userId } = req.user as any;

  const result = await AnalyticsServices.getProviderOverviewAnalytics(userId, days);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Provider analytics retrieved successfully!',
    data: result,
  });
});

const getAdminAiInsights = catchAsync(async (req: Request, res: Response) => {
  const days = toDays(req.query.days);
  const insight = await AnalyticsServices.getAdminAiInsights(days);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'AI insights generated successfully.',
    data: { insight },
  });
});

export const AnalyticsController = {
  getAdminOverview,
  getProviderOverview,
  getAdminAiInsights,
};
