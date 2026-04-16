import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { parsePaginationQuery } from '../../shared/queryParser';
import { CouponServices } from './coupon.service';
const createCoupon = catchAsync(async (req, res) => {
    const result = await CouponServices.createCoupon({
        ...req.body,
        startsAt: req.body.startsAt ? new Date(req.body.startsAt) : undefined,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
    });
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: 'Coupon created successfully!',
        data: result,
    });
});
const getAllCoupons = catchAsync(async (req, res) => {
    const queryOptions = parsePaginationQuery(req.query, {
        allowedSortBy: ['createdAt', 'updatedAt', 'code', 'usedCount', 'discountValue'],
        allowedFilterKeys: ['isActive', 'providerId'],
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'desc',
        defaultLimit: 10,
    });
    const result = await CouponServices.getAllCoupons(queryOptions, {
        isActive: queryOptions.filters.isActive,
        providerId: queryOptions.filters.providerId,
    });
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Coupons retrieved successfully!',
        data: result.data,
        meta: result.meta,
    });
});
const updateCoupon = catchAsync(async (req, res) => {
    const result = await CouponServices.updateCoupon(req.params.id, {
        ...req.body,
        startsAt: req.body.startsAt ? new Date(req.body.startsAt) : undefined,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
    });
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Coupon updated successfully!',
        data: result,
    });
});
const deleteCoupon = catchAsync(async (req, res) => {
    const result = await CouponServices.deleteCoupon(req.params.id);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Coupon deleted successfully!',
        data: result,
    });
});
export const CouponController = {
    createCoupon,
    getAllCoupons,
    updateCoupon,
    deleteCoupon,
};
