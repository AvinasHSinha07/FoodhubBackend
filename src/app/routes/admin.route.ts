import express from 'express';
import { UserController } from '../module/user/user.controller';
import { OrderController } from '../module/order/order.controller';
import { CategoryController } from '../module/category/category.controller';
import { UserValidation } from '../module/user/user.validation';
import auth from '../middleware/auth';
import validateRequest from '../middleware/validateRequest';
import { CategoryValidation } from '../module/category/category.validation';
import { CouponController } from '../module/coupon/coupon.controller';
import { CouponValidation } from '../module/coupon/coupon.validation';
import { AnalyticsController } from '../module/analytics/analytics.controller';

const router = express.Router();

// User Management (Admin Only)
router.get('/users', auth('ADMIN'), UserController.getAllUsers);
router.patch(
  '/users/:id/status',
  auth('ADMIN'),
  validateRequest(UserValidation.updateUserStatusZodSchema),
  UserController.updateUserStatus
);

// Order Monitoring (Admin Only)
router.get('/orders', auth('ADMIN'), OrderController.getMyOrders);

// Coupon Management (Admin Only)
router.post(
  '/coupons',
  auth('ADMIN'),
  validateRequest(CouponValidation.createCouponZodSchema),
  CouponController.createCoupon
);
router.get('/coupons', auth('ADMIN'), CouponController.getAllCoupons);
router.patch(
  '/coupons/:id',
  auth('ADMIN'),
  validateRequest(CouponValidation.updateCouponZodSchema),
  CouponController.updateCoupon
);
router.delete('/coupons/:id', auth('ADMIN'), CouponController.deleteCoupon);

// Platform Analytics (Admin Only)
router.get('/analytics/overview', auth('ADMIN'), AnalyticsController.getAdminOverview);
router.get('/analytics/ai-insights', auth('ADMIN'), AnalyticsController.getAdminAiInsights);


// Category Management (Admin Only)
router.post(
  '/categories',
  auth('ADMIN'),
  validateRequest(CategoryValidation.createCategoryZodSchema),
  CategoryController.createCategory
);

router.put(
  '/categories/:id',
  auth('ADMIN'),
  validateRequest(CategoryValidation.updateCategoryZodSchema),
  CategoryController.updateCategory
);

router.delete('/categories/:id', auth('ADMIN'), CategoryController.deleteCategory);

export const AdminRoutes = router;