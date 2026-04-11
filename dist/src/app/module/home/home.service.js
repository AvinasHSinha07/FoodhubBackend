import { prisma } from '../../lib/prisma';
const getHomeSummary = async () => {
    const [featuredCategories, featuredMeals, topProviders, testimonials, stats] = await Promise.all([
        prisma.category.findMany({
            take: 6,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: {
                        meals: true,
                    },
                },
            },
        }),
        prisma.meal.findMany({
            where: { isAvailable: true },
            take: 8,
            orderBy: { createdAt: 'desc' },
            include: {
                category: true,
                provider: {
                    select: {
                        id: true,
                        restaurantName: true,
                        logo: true,
                    },
                },
            },
        }),
        prisma.providerProfile.findMany({
            take: 6,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                    },
                },
                meals: {
                    include: {
                        reviews: {
                            select: {
                                rating: true,
                            },
                        },
                    },
                },
            },
        }),
        prisma.review.findMany({
            where: {
                comment: {
                    not: null,
                },
            },
            take: 6,
            orderBy: { createdAt: 'desc' },
            include: {
                customer: {
                    select: {
                        name: true,
                        image: true,
                    },
                },
            },
        }),
        Promise.all([
            prisma.user.count({ where: { isDeleted: false } }),
            prisma.providerProfile.count(),
            prisma.meal.count({ where: { isAvailable: true } }),
            prisma.order.count(),
        ]),
    ]);
    const mappedTopProviders = topProviders.map((provider) => {
        const ratings = provider.meals.flatMap((meal) => meal.reviews.map((review) => review.rating));
        const averageRating = ratings.length > 0
            ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1))
            : null;
        return {
            ...provider,
            averageRating,
            reviewCount: ratings.length,
            mealCount: provider.meals.length,
        };
    });
    return {
        featuredCategories,
        featuredMeals,
        topProviders: mappedTopProviders,
        testimonials: testimonials.map((testimonial) => ({
            id: testimonial.id,
            rating: testimonial.rating,
            comment: testimonial.comment,
            createdAt: testimonial.createdAt,
            customer: testimonial.customer,
        })),
        stats: {
            totalUsers: stats[0],
            totalProviders: stats[1],
            totalAvailableMeals: stats[2],
            totalOrders: stats[3],
        },
    };
};
export const HomeServices = {
    getHomeSummary,
};
