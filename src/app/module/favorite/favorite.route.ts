import express from 'express';
import auth from '../../middleware/auth';
import { FavoriteController } from './favorite.controller';

const router = express.Router();

router.get('/meals', auth('CUSTOMER'), FavoriteController.getMyMealFavorites);
router.get('/providers', auth('CUSTOMER'), FavoriteController.getMyProviderFavorites);

router.get('/meals/:mealId/state', auth('CUSTOMER'), FavoriteController.getMealFavoriteState);
router.get('/providers/:providerId/state', auth('CUSTOMER'), FavoriteController.getProviderFavoriteState);

router.post('/meals/:mealId/toggle', auth('CUSTOMER'), FavoriteController.toggleMealFavorite);
router.post('/providers/:providerId/toggle', auth('CUSTOMER'), FavoriteController.toggleProviderFavorite);

export const FavoriteRoutes = router;
