import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { toNodeHandler } from "better-auth/node";
import { auth } from './app/lib/auth';
import router from './app/routes';
import globalErrorHandler from './app/middleware/globalErrorHandler';
import notFound from './app/middleware/notFound';


const app: Application = express();
const SELF_ASSIGNABLE_ROLES = new Set(['CUSTOMER', 'PROVIDER']);

// CORS (must be before parsers for preflight OPTIONS handling)
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Stripe webhook (needs raw body, before express.json)
import { PaymentController } from './app/module/payment/payment.controller';
app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), PaymentController.handleWebhook);

// Parsers
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Better-Auth Core Handler
app.use('/api/v1/auth', (req, res, next) => {
  if (req.method !== 'POST') {
    return next();
  }

  const isSignUpPath = req.path.includes('sign-up');
  if (!isSignUpPath) {
    return next();
  }

  const role = req.body?.role;
  if (typeof role === 'string' && !SELF_ASSIGNABLE_ROLES.has(role)) {
    req.body.role = 'CUSTOMER';
  }

  return next();
});

app.all("/api/v1/auth/*path", toNodeHandler(auth));
app.all("/api/v1/auth", toNodeHandler(auth));

// Application Routes
app.use('/api/v1', router);

// Base Route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to FoodHub API!'
  });
});

// Global Error Handler & Not Found Middleware
app.use(notFound);
app.use(globalErrorHandler);

export default app;