import express from 'express';
import { PaymentController } from './payment.controller';
import auth from '../../middleware/auth';

const router = express.Router();

router.post(
  '/create-intent',
  auth('CUSTOMER'),
  PaymentController.createPaymentIntent
);

router.post(
  '/confirm',
  auth('CUSTOMER'),
  PaymentController.confirmPayment
);

router.post(
  '/cod/collect',
  auth('PROVIDER'),
  PaymentController.collectCodPayment
);

export const PaymentRoutes = router;