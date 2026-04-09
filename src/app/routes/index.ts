import express from 'express';
import { UserRoutes } from '../module/user/user.route';
import { CategoryRoutes } from '../module/category/category.route';
import { ProviderProfileRoutes } from '../module/providerProfile/providerProfile.route';
import { MealRoutes } from '../module/meal/meal.route';
import { OrderRoutes } from '../module/order/order.route';
import { ReviewRoutes } from '../module/review/review.route';

// Role Specific Routes
import { AdminRoutes } from './admin.route';
import { ProviderRoutes } from './provider.route';
import { UploadRoutes } from '../module/upload/upload.route';
import { PaymentRoutes } from '../module/payment/payment.route';

const router = express.Router();

const moduleRoutes = [
    {
      path: '/admin',
      route: AdminRoutes,
    },
    {
      path: '/provider',
      route: ProviderRoutes,
    },
    {
      path: '/upload',
      route: UploadRoutes,
    },
    {
      path: '/payments',
      route: PaymentRoutes,
    },
    // Standard Public/Customer Routes
    {
      path: '/users',
      route: UserRoutes,
    },
    {
      path: '/categories',
      route: CategoryRoutes,
    },
    {
      path: '/providers', // Renamed from provider-profiles to match README spec
      route: ProviderProfileRoutes,
    },
    {
      path: '/meals',
      route: MealRoutes,
    },
    {
      path: '/orders',
      route: OrderRoutes,
    },
    {
      path: '/reviews',
      route: ReviewRoutes,
    },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;