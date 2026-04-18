
import { prisma } from '../../lib/prisma';
import Stripe from 'stripe';
import status from 'http-status';
import AppError from '../../errorHelpers/AppError';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const TAX_AND_FEES_MULTIPLIER = 1.1;

const createPaymentIntent = async (userId: string, orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new AppError(status.NOT_FOUND, 'Order not found');
  }

  if (order.customerId !== userId) {
    throw new AppError(status.FORBIDDEN, 'You are not allowed to pay for this order');
  }

  if (order.paymentMethod !== PaymentMethod.STRIPE) {
    throw new AppError(status.BAD_REQUEST, 'This order does not require Stripe payment.');
  }

  if (order.paymentStatus === PaymentStatus.PAID) {
    throw new AppError(status.CONFLICT, 'This order is already paid');
  }

  const requestedAmount = Number((order.totalPrice * TAX_AND_FEES_MULTIPLIER).toFixed(2));

  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    throw new AppError(status.BAD_REQUEST, 'Invalid payment amount');
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

  if (order.paymentMethod !== PaymentMethod.STRIPE) {
    throw new AppError(status.BAD_REQUEST, 'This order does not require Stripe payment.');
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

const handleWebhook = async (event: any) => {
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as any;
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
    const paymentIntent = event.data.object as any;
    if (paymentIntent.metadata.orderId) {
      await prisma.order.update({
        where: { id: paymentIntent.metadata.orderId },
        data: { paymentStatus: 'FAILED' },
      });
    }
  }
};

const markCodAsCollected = async (providerUserId: string, orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      provider: {
        select: { userId: true },
      },
    },
  });

  if (!order) {
    throw new AppError(status.NOT_FOUND, 'Order not found');
  }

  if (order.provider.userId !== providerUserId) {
    throw new AppError(status.FORBIDDEN, 'You are not allowed to collect payment for this order');
  }

  if (order.paymentMethod !== PaymentMethod.COD) {
    throw new AppError(status.BAD_REQUEST, 'This order is not a cash-on-delivery order');
  }

  if (order.paymentStatus === PaymentStatus.COD_COLLECTED || order.paymentStatus === PaymentStatus.PAID) {
    throw new AppError(status.CONFLICT, 'Payment is already collected for this order');
  }

  if (order.orderStatus !== OrderStatus.READY && order.orderStatus !== OrderStatus.DELIVERED) {
    throw new AppError(status.BAD_REQUEST, 'COD can only be collected when order is ready or delivered');
  }

  return prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: PaymentStatus.COD_COLLECTED,
    },
  });
};

export const PaymentService = {
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
  markCodAsCollected,
};