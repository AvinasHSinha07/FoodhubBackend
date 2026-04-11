import { prisma } from '../../lib/prisma';
import Stripe from 'stripe';
import status from 'http-status';
import AppError from '../../errorHelpers/AppError';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const TAX_AND_FEES_MULTIPLIER = 1.1;
const createPaymentIntent = async (userId, orderId) => {
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
const confirmPayment = async (userId, orderId, paymentIntentId) => {
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
const handleWebhook = async (event) => {
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
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
        const paymentIntent = event.data.object;
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
