import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { PaymentService } from './payment.service';
import Stripe from 'stripe';
import AppError from '../../errorHelpers/AppError';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const createPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const { orderId, amount } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Unauthorized request');
  }

  const result = await PaymentService.createPaymentIntent(userId, orderId, amount);

  sendResponse(res, {
    httpStatusCode: httpStatus.OK,
    success: true,
    message: 'Payment intent created successfully',
    data: result,
  });
});

const confirmPayment = catchAsync(async (req: Request, res: Response) => {
  const { orderId, paymentIntentId } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Unauthorized request');
  }

  const result = await PaymentService.confirmPayment(userId, orderId, paymentIntentId);

  sendResponse(res, {
    httpStatusCode: httpStatus.OK,
    success: true,
    message: 'Payment confirmed successfully',
    data: result,
  });
});

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // This MUST be the raw unparsed body
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  await PaymentService.handleWebhook(event);

  res.json({ received: true });
});

export const PaymentController = {
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
};