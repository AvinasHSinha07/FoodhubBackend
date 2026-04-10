import express from 'express';
import { MealController } from '../module/meal/meal.controller';
import { OrderController } from '../module/order/order.controller';
import auth from '../middleware/auth';
import validateRequest from '../middleware/validateRequest';
import { MealValidation } from '../module/meal/meal.validation';
const router = express.Router();
// Meal Management (Provider Only)
router.post('/meals', auth('PROVIDER'), validateRequest(MealValidation.createMealZodSchema), MealController.createMeal);
router.put('/meals/:id', auth('PROVIDER'), validateRequest(MealValidation.updateMealZodSchema), MealController.updateMeal);
router.delete('/meals/:id', auth('PROVIDER'), MealController.deleteMeal);
// Order Management (Provider Only)
// Update order status PATCH /orders/:id
router.patch('/orders/:id', auth('PROVIDER'), OrderController.updateOrderStatus);
export const ProviderRoutes = router;
