import express from 'express';
import { ProviderProfileController } from './providerProfile.controller';
import validateRequest from '../../middleware/validateRequest';
import { ProviderProfileValidation } from './providerProfile.validation';
import auth from '../../middleware/auth';

const router = express.Router();

router.post(
  '/me',
  auth('PROVIDER'),
  validateRequest(ProviderProfileValidation.createProfileZodSchema),
  ProviderProfileController.createMyProfile
);

router.get('/me', auth('PROVIDER'), ProviderProfileController.getMyProfile);

router.patch(
  '/me',
  auth('PROVIDER'),
  validateRequest(ProviderProfileValidation.updateProfileZodSchema),
  ProviderProfileController.updateMyProfile
);

router.get('/', ProviderProfileController.getAllProviders);

export const ProviderProfileRoutes = router;