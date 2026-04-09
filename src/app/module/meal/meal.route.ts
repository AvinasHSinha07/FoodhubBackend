import express from 'express';
import { MealController } from './meal.controller';
import validateRequest from '../../middleware/validateRequest';
import { MealValidation } from './meal.validation';
import auth from '../../middleware/auth';

const router = express.Router();

router.post(
  '/',
  auth('PROVIDER'),
  validateRequest(MealValidation.createMealZodSchema),
  MealController.createMeal
);

router.get('/', MealController.getAllMeals);
router.get('/:id', MealController.getMealById);

router.patch(
  '/:id',
  auth('PROVIDER'),
  validateRequest(MealValidation.updateMealZodSchema),
  MealController.updateMeal
);

router.delete('/:id', auth('PROVIDER'), MealController.deleteMeal);

export const MealRoutes = router;