import express from 'express';
import { UserRoutes } from '../module/user/user.route';
import { CategoryRoutes } from '../module/category/category.route';
import { ProviderProfileRoutes } from '../module/providerProfile/providerProfile.route';
import { MealRoutes } from '../module/meal/meal.route';
import { OrderRoutes } from '../module/order/order.route';
import { ReviewRoutes } from '../module/review/review.route';

const router = express.Router();

const moduleRoutes: any[] = [
    {
      path: '/users',
      route: UserRoutes,
    },
    {
      path: '/categories',
      route: CategoryRoutes,
    },
    {
      path: '/provider-profiles',
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