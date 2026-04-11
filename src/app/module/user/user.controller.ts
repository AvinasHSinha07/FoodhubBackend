import { Request, Response } from 'express';
import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import AppError from '../../errorHelpers/AppError';
import { UserServices } from './user.service';
import { parsePaginationQuery } from '../../shared/queryParser';

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const queryOptions = parsePaginationQuery(req.query, {
    allowedSortBy: ['createdAt', 'name', 'email', 'updatedAt'],
    allowedFilterKeys: ['role', 'status'],
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    defaultLimit: 10,
  });

  const result = await UserServices.getAllUsers(queryOptions, {
    role: queryOptions.filters.role,
    status: queryOptions.filters.status,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Users retrieved successfully!',
    data: result.data,
    meta: result.meta,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.user as any; 

  const result = await UserServices.getMyProfile(email);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Profile retrieved successfully!',
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.user as any;
  const payload = req.body; // usually name, image

  // Prevent role/status/auth field injection here
  delete (payload as any).role;
  delete (payload as any).status;
  delete (payload as any).isDeleted;
  delete (payload as any).needPasswordChange;

  const result = await UserServices.updateMyProfile(email, payload);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Profile updated successfully!',
    data: result,
  });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const { status: userStatus } = req.body as { status: 'ACTIVE' | 'BLOCKED' };

  const result = await UserServices.updateUserStatus(userId, userStatus);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'User status updated successfully!',
    data: result,
  });
});

export const UserController = {
  getAllUsers,
  getMyProfile,
  updateMyProfile,
  updateUserStatus,
};