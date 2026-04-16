import express from 'express';
import { MealController } from '../module/meal/meal.controller';
import { OrderController } from '../module/order/order.controller';
import auth from '../middleware/auth';
import validateRequest from '../middleware/validateRequest';
import { MealValidation } from '../module/meal/meal.validation';
import { OrderValidation } from '../module/order/order.validation';
import { AnalyticsController } from '../module/analytics/analytics.controller';
const router = express.Router();
// Meal Management (Provider Only)
router.post('/meals', auth('PROVIDER'), validateRequest(MealValidation.createMealZodSchema), MealController.createMeal);
router.put('/meals/:id', auth('PROVIDER'), validateRequest(MealValidation.updateMealZodSchema), MealController.updateMeal);
router.delete('/meals/:id', auth('PROVIDER'), MealController.deleteMeal);
// Order Management (Provider Only)
router.patch('/orders/:id/status', auth('PROVIDER'), validateRequest(OrderValidation.updateOrderStatusZodSchema), OrderController.updateOrderStatus);
router.get('/analytics/overview', auth('PROVIDER'), AnalyticsController.getProviderOverview);
export const ProviderRoutes = router;
