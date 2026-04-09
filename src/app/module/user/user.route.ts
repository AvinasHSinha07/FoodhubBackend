import express from 'express';
import { UserController } from './user.controller';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { UserValidation } from './user.validation';

const router = express.Router();

router.get(
  '/me',
  auth('CUSTOMER', 'PROVIDER', 'ADMIN'),
  UserController.getMyProfile,
);

router.patch(
  '/me',
  auth('CUSTOMER', 'PROVIDER', 'ADMIN'),
  validateRequest(UserValidation.updateProfileZodSchema),
  UserController.updateMyProfile,
);

router.get(
  '/',
  auth('ADMIN'), // Admin only endpoint
  UserController.getAllUsers,
);

export const UserRoutes = router;