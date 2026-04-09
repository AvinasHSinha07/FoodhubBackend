import 'dotenv/config';
import { prisma } from '../src/app/lib/prisma';
import bcrypt from 'bcrypt';

async function main() {
  console.log('Seeding database...');

  // 1. Seed Admin
  const adminEmail = 'admin@foodhub.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', parseInt(process.env.BCRYPT_SALT_ROUNDS as string) || 10);
    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin',
        email: adminEmail,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    await prisma.account.create({
      data: {
        userId: adminUser.id,
        accountId: adminEmail,
        providerId: 'credential',
        password: hashedPassword,
      },
    });
    console.log('Admin seeded successfully.');
  } else {
    console.log('Admin already exists.');
  }

  // 2. Seed Categories
  const categoriesData = [
    { name: 'Fast Food', slug: 'fast-food' },
    { name: 'Healthy Meals', slug: 'healthy-meals' },
    { name: 'Desserts', slug: 'desserts' },
    { name: 'Beverages', slug: 'beverages' },
    { name: 'Seafood', slug: 'seafood' },
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log('Categories seeded successfully.');

  // 3. Create Sample Provider (If no provider exists)
  const providersCount = await prisma.providerProfile.count();
  if (providersCount === 0) {
    const hashedPassword = await bcrypt.hash('provider123', 10);
    const providerUser = await prisma.user.create({
      data: {
        name: 'Sample Provider',
        email: 'provider@foodhub.com',
        role: 'PROVIDER',
        status: 'ACTIVE',
      },
    });

    await prisma.account.create({
      data: {
        userId: providerUser.id,
        accountId: 'provider@foodhub.com',
        providerId: 'credential',
        password: hashedPassword,
      },
    });

    const providerProfile = await prisma.providerProfile.create({
      data: {
        userId: providerUser.id,
        restaurantName: 'Spicy House',
        description: 'Best local spicy foods.',
        address: '123 Food Street',
        cuisineType: 'Local',
      },
    });

    console.log('Sample Provider and Profile seeded.');

    // 4. Sample Meal
    const category = await prisma.category.findFirst();
    if (category) {
      await prisma.meal.create({
        data: {
          providerId: providerProfile.id,
          categoryId: category.id,
          title: 'Chicken Biryani',
          description: 'Spicy and delicious biryani.',
          price: 250.0,
          image: 'https://via.placeholder.com/150',
          isAvailable: true,
          dietaryTag: 'Non-Veg',
        },
      });
      console.log('Sample Meal seeded.');
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });