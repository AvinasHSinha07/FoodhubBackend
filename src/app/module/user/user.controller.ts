import { Request, Response } from 'express';
import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import AppError from '../../errorHelpers/AppError';
import { UserServices } from './user.service';

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const filters = {
    searchTerm: req.query.searchTerm as string,
    role: req.query.role as string,
    status: req.query.status as string,
  };

  // Remove undefined
  Object.keys(filters).forEach((key) => {
    if ((filters as any)[key] === undefined) {
      delete (filters as any)[key];
    }
  });

  const result = await UserServices.getAllUsers(filters);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'Users retrieved successfully!',
    data: result,
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