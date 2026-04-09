import express from 'express';
import { UserController } from '../module/user/user.controller';
import { OrderController } from '../module/order/order.controller';
import { CategoryController } from '../module/category/category.controller';
import auth from '../middleware/auth';
import validateRequest from '../middleware/validateRequest';
import { CategoryValidation } from '../module/category/category.validation';

const router = express.Router();

// User Management (Admin Only)
router.get('/users', auth('ADMIN'), UserController.getAllUsers);
// Optional: PATCH /users/:id/status (Requires a new controller method or use an update toggle)
// For now, mapping directly to existing updates handled manually
// You will implement status toggling inside user.controller.ts if requested

// Order Monitoring (Admin Only)
router.get('/orders', auth('ADMIN'), OrderController.getMyOrders);

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