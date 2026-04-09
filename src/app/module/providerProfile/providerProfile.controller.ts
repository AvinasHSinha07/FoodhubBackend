import { Request, Response } from 'express';
import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { ProviderProfileServices } from './providerProfile.service';

const createMyProfile = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as any;
  const result = await ProviderProfileServices.createMyProfile(userId, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: 'Provider profile created successfully!',
    data: result,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as any;
  const result = await ProviderProfileServices.getMyProfile(userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Provider profile retrieved successfully!',
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as any;
  const result = await ProviderProfileServices.updateMyProfile(userId, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Provider profile updated successfully!',
    data: result,
  });
});

const getAllProviders = catchAsync(async (req: Request, res: Response) => {
  const filters: Record<string, any> = {
    searchTerm: req.query.searchTerm as string,
  };
  Object.keys(filters).forEach((key) => filters[key] === undefined && delete filters[key]);

  const result = await ProviderProfileServices.getAllProviders(filters);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Providers retrieved successfully!',
    data: result,
  });
});

export const ProviderProfileController = {
  createMyProfile,
  getMyProfile,
  updateMyProfile,
  getAllProviders,
};