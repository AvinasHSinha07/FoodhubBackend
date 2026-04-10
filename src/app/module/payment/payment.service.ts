
import { prisma } from '../../lib/prisma';
import Stripe from 'stripe';
import status from 'http-status';
import AppError from '../../errorHelpers/AppError';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const createPaymentIntent = async (userId: string, orderId: string, amount?: number) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new AppError(status.NOT_FOUND, 'Order not found');
  }

  if (order.customerId !== userId) {
    throw new AppError(status.FORBIDDEN, 'You are not allowed to pay for this order');
  }

  if (order.paymentStatus === 'PAID') {
    throw new AppError(status.CONFLICT, 'This order is already paid');
  }

  const requestedAmount = typeof amount === 'number' ? amount : order.totalPrice;

  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    throw new AppError(status.BAD_REQUEST, 'Invalid payment amount');
  }

  // Never allow charging less than the persisted order value.
  if (requestedAmount < order.totalPrice) {
    throw new AppError(status.BAD_REQUEST, 'Payment amount cannot be lower than order total');
  }

  const amountInCents = Math.round(requestedAmount * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: 'usd',
    payment_method_types: ['card'],
    metadata: {
      orderId,
      customerId: userId,
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
};

const confirmPayment = async (userId: string, orderId: string, paymentIntentId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new AppError(status.NOT_FOUND, 'Order not found');
  }

  if (order.customerId !== userId) {
    throw new AppError(status.FORBIDDEN, 'You are not allowed to confirm payment for this order');
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.metadata?.orderId && paymentIntent.metadata.orderId !== orderId) {
    throw new AppError(status.BAD_REQUEST, 'Payment intent does not belong to this order');
  }

  if (paymentIntent.status === 'succeeded') {
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'PAID',
        stripePaymentIntentId: paymentIntent.id,
      },
    });
    return updatedOrder;
  }

  throw new AppError(status.BAD_REQUEST, 'Payment not successful');
};

const handleWebhook = async (event: Stripe.Event) => {
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    if (paymentIntent.metadata.orderId) {
      await prisma.order.update({
        where: { id: paymentIntent.metadata.orderId },
        data: {
          paymentStatus: 'PAID',
          stripePaymentIntentId: paymentIntent.id,
        },
      });
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    if (paymentIntent.metadata.orderId) {
      await prisma.order.update({
        where: { id: paymentIntent.metadata.orderId },
        data: { paymentStatus: 'FAILED' },
      });
    }
  }
};

export const PaymentService = {
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
};