import { prisma } from '../../lib/prisma';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const createPaymentIntent = async (orderId, amount) => {
    const amountInCents = Math.round(amount * 100);
    const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        payment_method_types: ['card'],
        metadata: {
            orderId,
        },
    });
    return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
    };
};
const confirmPayment = async (orderId, paymentIntentId) => {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status === 'succeeded') {
        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: {
                paymentStatus: 'PAID',
            },
        });
        return updatedOrder;
    }
    throw new Error('Payment not successful');
};
const handleWebhook = async (event) => {
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        if (paymentIntent.metadata.orderId) {
            await prisma.order.update({
                where: { id: paymentIntent.metadata.orderId },
                data: { paymentStatus: 'PAID' },
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
