import express from 'express';
import { OrderController } from './order.controller';
import validateRequest from '../../middleware/validateRequest';
import { OrderValidation } from './order.validation';
import auth from '../../middleware/auth';
const router = express.Router();
router.post('/', auth('CUSTOMER'), // Only customers can create orders
validateRequest(OrderValidation.createOrderZodSchema), OrderController.createOrder);
router.post('/coupon-preview', auth('CUSTOMER'), validateRequest(OrderValidation.couponPreviewZodSchema), OrderController.previewCoupon);
router.get('/my-orders', auth('CUSTOMER', 'PROVIDER', 'ADMIN'), OrderController.getMyOrders);
router.get('/:id', auth('CUSTOMER', 'PROVIDER', 'ADMIN'), OrderController.getOrderById);
router.post('/:id/reorder', auth('CUSTOMER'), OrderController.reorderFromPrevious);
router.patch('/:id/status', auth('PROVIDER'), // Only providers can update the physical order fulfillment status
validateRequest(OrderValidation.updateOrderStatusZodSchema), OrderController.updateOrderStatus);
export const OrderRoutes = router;
