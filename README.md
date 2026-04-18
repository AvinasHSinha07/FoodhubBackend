# FoodHub - Backend API 🚀

## 📌 Project Description
FoodHub Backend is a highly secure, scalable, role-based RESTful API that powers the FoodHub meal-ordering platform. It serves as the primary engine for an end-to-end food delivery business, managing complex relationships across three distinct user roles: Customers, Providers (Restaurants), and Administrators. The backend seamlessly handles authentication, secure Stripe payments, cloud-based media storage, and comprehensive dashboard analytics.

## 🌐 Live URLs
- **Backend API Live URL**: [https://foodhubbackend-5iv9.onrender.com/](https://foodhubbackend-5iv9.onrender.com/)
- **Frontend Live URL**: [https://foodhub-frontend-vyqi.vercel.app/](https://foodhub-frontend-vyqi.vercel.app/)

## ✨ Comprehensive Features

### Robust Authentication & Security
- **Better Auth Integration**: State-of-the-art authentication handling registration, secure login, and robust session validation.
- **JWT Authorization**: Token-based architecture verifying each user's identity on protected API routes.
- **Role-Based Access Control (RBAC)**: Strict separation of endpoints for Customer operations, Provider business configurations, and Admin system oversight limits data access to authorized roles only.

### 👥 User & Profile Dynamics
- **Customers**: Can create profiles, safely store delivery addresses, view order history, and leave trusted reviews on meals they have purchased.
- **Providers (Restaurants)**: Can establish rich restaurant profiles including cuisine type, description, and upload distinct banner and logo assets.
- **Administrators**: Enjoy universal oversight with capabilities to suspend/activate any platform user to maintain platform safety.

### 🍔 Menu & Meal Management
- **Extensive CRUD Operations**: Complete creation, reading, updating, and deletion (CRUD) for all meals.
- **Cloudinary Integration**: Images uploaded via `Multer` are seamlessly transmitted and inherently optimized directly into Cloudinary, offloading heavy media from the primary server.
- **Categorization**: System-defined category structures so meals remain easily filterable by cuisine and meal type.

### 🛒 Ordering System & Payments
- **Advanced Order Tracking**: Status transitions representing the entire food lifecycle (`PLACED` -> `PREPARING` -> `READY` -> `DELIVERED`).
- **Stripe Secure Checkout**: API integration to create validated Stripe Payment Intents and securely handle payment state mapping post-transaction.

### 👑 Admin Management Functions
- **Global Overview Dashboard**: API endpoints serving critical statistics (total users, active orders, provider revenue).
- **Category Enforcement**: Centralized creation and structuring of food categories to ensure a clean UI on the client end.
- **Platform Moderation**: Broad capabilities to modify provider privileges and access historical transactional details across the system.

## 🛠️ Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Better Auth, JSON Web Tokens (JWT), bcrypt
- **Payments**: Stripe SDK
- **Storage**: Cloudinary SDK, Multer
- **Validation**: Zod

## 📂 Project Structure
```bash
src/
├── app/
│   ├── config/        # Environment configurations
│   ├── middlewares/   # Authentication, validation, and error middlewares
│   ├── modules/       # Domain-specific modules (Controllers, Services)
│   ├── routes/        # Centralized routing mapping
│   ├── utils/         # Helper functions
│   └── validations/   # Zod validation schemas
├── app.ts             # Express App Configuration
└── server.ts          # Entry Point
prisma/
├── schema.prisma      # Database Schema
└── seed.ts            # Database seed script for Admins/Categories
```

## ⚙️ Environment Variables
Create a `.env` file in the root directory and configure the following variables:
```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/foodhub
CLIENT_URL=http://localhost:3000
NODE_ENV=development

# JWT Secrets
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Better Auth Configuration
BETTER_AUTH_SECRET=your_better_auth_secret
BETTER_AUTH_URL=http://localhost:5000

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Setup the Database via Prisma
```bash
npx prisma generate
npx prisma migrate dev --name init
npm run seed  # Generates initial Admin account and seeded Categories
```

### 4. Start the Application
```bash
npm run dev
```
The server will start on `http://localhost:5000` (or your configured `PORT`).

## 📜 Available Scripts
- `npm run dev`: Starts the development server using TSX.
- `npm run build`: Generates Prisma client and compiles TypeScript down to JavaScript.
- `npm run start`: Runs the compiled node distribution.
- `npm run seed`: Executes the database seed scripts.

## 🤝 Contribution
Ensure that all routes are correctly protected by checking the user's role before processing mutations or exposing sensitive queries. Use the globally defined error handler to forward errors appropriately.
