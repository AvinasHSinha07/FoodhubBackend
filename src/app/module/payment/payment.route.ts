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

// Note: Ensure your main app.ts passes this route with express.raw() to preserve signature
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  PaymentController.handleWebhook
);

export const PaymentRoutes = router;