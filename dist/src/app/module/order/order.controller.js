import status from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { OrderServices } from './order.service';
const createOrder = catchAsync(async (req, res) => {
    const { userId } = req.user;
    const result = await OrderServices.createOrder(userId, req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: 'Order placed successfully!',
        data: result,
    });
});
const getMyOrders = catchAsync(async (req, res) => {
    const { userId, role } = req.user;
    const result = await OrderServices.getMyOrders(userId, role);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Orders retrieved successfully!',
        data: result,
    });
});
const getOrderById = catchAsync(async (req, res) => {
    const { userId, role } = req.user;
    const result = await OrderServices.getOrderById(req.params.id, userId, role);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Order retrieved successfully!',
        data: result,
    });
});
const updateOrderStatus = catchAsync(async (req, res) => {
    const { userId } = req.user;
    const normalizedStatus = req.body.status || req.body.orderStatus;
    const result = await OrderServices.updateOrderStatus(req.params.id, userId, normalizedStatus);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: 'Order status updated successfully!',
        data: result,
    });
});
export const OrderController = {
    createOrder,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
};
