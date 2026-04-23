
import { prisma } from '../../lib/prisma';
import Stripe from 'stripe';
import status from 'http-status';
import AppError from '../../errorHelpers/AppError';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import {
  computeOrderFinancialSnapshot,
  STRIPE_CUSTOMER_CHARGE_MULTIPLIER,
} from '../../utils/revenue';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const toMoney = (value: number) => Number(value.toFixed(2));

type TStripePaymentIntentLike = {
  id: string;
  amount: number;
  amount_received: number;
  metadata: Record<string, string>;
  status: string;
};

const resolveCapturedCustomerAmount = (paymentIntent: TStripePaymentIntentLike) => {
  const capturedAmountInCents = paymentIntent.amount_received || paymentIntent.amount;
  return toMoney(capturedAmountInCents / 100);
};

const buildSettledSnapshot = ({
  order,
  customerPaidAmount,
}: {
  order: {
    totalPrice: number;
    discountAmount: number;
    paymentMethod: PaymentMethod;
    coupon: { providerId: string | null } | null;
    refundCostToAdmin: number;
    refundCostToProvider: number;
    platformFeeRate: number;
  };
  customerPaidAmount?: number;
}) => {
  return computeOrderFinancialSnapshot({
    totalPrice: order.totalPrice,
    discountAmount: order.discountAmount,
    paymentMethod: order.paymentMethod,
    couponProviderId: order.coupon?.providerId,
    customerPaidAmount,
    platformFeeRate: order.platformFeeRate,
    refundCostToAdmin: order.refundCostToAdmin,
    refundCostToProvider: order.refundCostToProvider,
  });
};

const getOrCreateStripeCustomer = async ({
  userId,
  name,
  email,
}: {
  userId: string;
  name: string;
  email: string;
}) => {
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 10,
  });

  const matchedCustomer =
    existingCustomers.data.find((customer) => customer.metadata?.appUserId === userId) ||
    existingCustomers.data[0];

  if (matchedCustomer) {
    if (matchedCustomer.name !== name || matchedCustomer.metadata?.appUserId !== userId) {
      return stripe.customers.update(matchedCustomer.id, {
        name,
        metadata: {
          ...matchedCustomer.metadata,
          appUserId: userId,
        },
      });
    }

    return matchedCustomer;
  }

  return stripe.customers.create({
    name,
    email,
    metadata: {
      appUserId: userId,
    },
  });
};

const createPaymentIntent = async (userId: string, orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: {
        select: {
          name: true,
          email: true,
        },
      },
    },
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

  const requestedAmount =
    order.customerPaidAmount > 0
      ? order.customerPaidAmount
      : Number((order.totalPrice * STRIPE_CUSTOMER_CHARGE_MULTIPLIER).toFixed(2));

  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    throw new AppError(status.BAD_REQUEST, 'Invalid payment amount');
  }

  const amountInCents = Math.round(requestedAmount * 100);
  const stripeCustomer = await getOrCreateStripeCustomer({
    userId,
    name: order.customer.name,
    email: order.customer.email,
  });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: 'usd',
    payment_method_types: ['card'],
    customer: stripeCustomer.id,
    receipt_email: order.customer.email,
    description: `Foodhub order ${orderId}`,
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
    include: {
      coupon: {
        select: {
          providerId: true,
        },
      },
    },
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
    const settledSnapshot = buildSettledSnapshot({
      order,
      customerPaidAmount: resolveCapturedCustomerAmount(paymentIntent),
    });

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        stripePaymentIntentId: paymentIntent.id,
        ...settledSnapshot,
      },
    });
    return updatedOrder;
  }

  throw new AppError(status.BAD_REQUEST, 'Payment not successful');
};

const handleWebhook = async (event: any) => {
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as TStripePaymentIntentLike;
    if (paymentIntent.metadata.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: paymentIntent.metadata.orderId },
        include: {
          coupon: {
            select: {
              providerId: true,
            },
          },
        },
      });

      if (!order) {
        return;
      }

      const settledSnapshot = buildSettledSnapshot({
        order,
        customerPaidAmount: resolveCapturedCustomerAmount(paymentIntent),
      });

      await prisma.order.update({
        where: { id: paymentIntent.metadata.orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          stripePaymentIntentId: paymentIntent.id,
          ...settledSnapshot,
        },
      });
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as TStripePaymentIntentLike;
    if (paymentIntent.metadata.orderId) {
      await prisma.order.update({
        where: { id: paymentIntent.metadata.orderId },
        data: { paymentStatus: PaymentStatus.FAILED },
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
      coupon: {
        select: {
          providerId: true,
        },
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

  const settledSnapshot = buildSettledSnapshot({
    order,
    customerPaidAmount: order.totalPrice,
  });

  return prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: PaymentStatus.COD_COLLECTED,
      ...settledSnapshot,
    },
  });
};

export const PaymentService = {
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
  markCodAsCollected,
};