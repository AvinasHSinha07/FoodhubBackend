import express from 'express';
import { UserController } from './user.controller';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { UserValidation } from './user.validation';
const router = express.Router();
router.get('/me', auth('CUSTOMER', 'PROVIDER', 'ADMIN'), UserController.getMyProfile);
router.patch('/me', auth('CUSTOMER', 'PROVIDER', 'ADMIN'), validateRequest(UserValidation.updateProfileZodSchema), UserController.updateMyProfile);
router.get('/me/addresses', auth('CUSTOMER'), UserController.getMyAddresses);
router.post('/me/addresses', auth('CUSTOMER'), validateRequest(UserValidation.createAddressZodSchema), UserController.createMyAddress);
router.patch('/me/addresses/:id', auth('CUSTOMER'), validateRequest(UserValidation.updateAddressZodSchema), UserController.updateMyAddress);
router.patch('/me/addresses/:id/default', auth('CUSTOMER'), UserController.setMyDefaultAddress);
router.delete('/me/addresses/:id', auth('CUSTOMER'), UserController.deleteMyAddress);
router.get('/', auth('ADMIN'), // Admin only endpoint
UserController.getAllUsers);
export const UserRoutes = router;
