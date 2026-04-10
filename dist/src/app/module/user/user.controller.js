import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { UserServices } from './user.service';
const getAllUsers = catchAsync(async (req, res) => {
    const filters = {
        searchTerm: req.query.searchTerm,
        role: req.query.role,
        status: req.query.status,
    };
    // Remove undefined
    Object.keys(filters).forEach((key) => {
        if (filters[key] === undefined) {
            delete filters[key];
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
const getMyProfile = catchAsync(async (req, res) => {
    const { email } = req.user;
    const result = await UserServices.getMyProfile(email);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Profile retrieved successfully!',
        data: result,
    });
});
const updateMyProfile = catchAsync(async (req, res) => {
    const { email } = req.user;
    const payload = req.body; // usually name, image
    // Prevent role/status/auth field injection here
    delete payload.role;
    delete payload.status;
    delete payload.isDeleted;
    delete payload.needPasswordChange;
    const result = await UserServices.updateMyProfile(email, payload);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Profile updated successfully!',
        data: result,
    });
});
const updateUserStatus = catchAsync(async (req, res) => {
    const userId = req.params.id;
    const { status: userStatus } = req.body;
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
