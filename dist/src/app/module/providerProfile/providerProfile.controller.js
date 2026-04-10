import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { ProviderProfileServices } from './providerProfile.service';
const createMyProfile = catchAsync(async (req, res) => {
    const { userId } = req.user;
    const result = await ProviderProfileServices.createMyProfile(userId, req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: 'Provider profile created successfully!',
        data: result,
    });
});
const getMyProfile = catchAsync(async (req, res) => {
    const { userId } = req.user;
    const result = await ProviderProfileServices.getMyProfile(userId);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Provider profile retrieved successfully!',
        data: result,
    });
});
const updateMyProfile = catchAsync(async (req, res) => {
    const { userId } = req.user;
    const result = await ProviderProfileServices.updateMyProfile(userId, req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Provider profile updated successfully!',
        data: result,
    });
});
const getAllProviders = catchAsync(async (req, res) => {
    const filters = {
        searchTerm: req.query.searchTerm,
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
const getProviderById = catchAsync(async (req, res) => {
    const result = await ProviderProfileServices.getProviderById(req.params.id);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Provider retrieved successfully!',
        data: result,
    });
});
export const ProviderProfileController = {
    createMyProfile,
    getMyProfile,
    updateMyProfile,
    getAllProviders,
    getProviderById,
};
