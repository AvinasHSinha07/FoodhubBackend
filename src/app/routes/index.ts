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
import { HomeRoutes } from '../module/home/home.route';
import { FavoriteRoutes } from '../module/favorite/favorite.route';
import { ChatRoutes } from '../module/chat/chat.route';
import { SearchRoutes } from '../module/search/search.route';

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
    {
      path: '/home',
      route: HomeRoutes,
    },
    {
      path: '/favorites',
      route: FavoriteRoutes,
    },
    {
      path: '/chat',
      route: ChatRoutes,
    },
    {
      path: '/search',
      route: SearchRoutes,
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
      path: '/providers', 
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