import express from 'express';
import { UserRoutes } from '../module/user/user.route';
import { CategoryRoutes } from '../module/category/category.route';
import { ProviderProfileRoutes } from '../module/providerProfile/providerProfile.route';

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
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;