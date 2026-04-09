import express from 'express';
import { ReviewController } from './review.controller';
import validateRequest from '../../middleware/validateRequest';
import { ReviewValidation } from './review.validation';
import auth from '../../middleware/auth';

const router = express.Router();

router.post(
  '/',
  auth('CUSTOMER'),
  validateRequest(ReviewValidation.createReviewZodSchema),
  ReviewController.createReview
);

router.get('/meal/:mealId', ReviewController.getReviewsByMeal);

router.delete('/:id', auth('CUSTOMER', 'ADMIN'), ReviewController.deleteReview);

export const ReviewRoutes = router;