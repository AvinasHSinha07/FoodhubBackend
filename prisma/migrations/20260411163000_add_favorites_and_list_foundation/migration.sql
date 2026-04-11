-- CreateTable
CREATE TABLE "meal_favorite" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_favorite" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_favorite_customerId_mealId_key" ON "meal_favorite"("customerId", "mealId");

-- CreateIndex
CREATE INDEX "meal_favorite_customerId_idx" ON "meal_favorite"("customerId");

-- CreateIndex
CREATE INDEX "meal_favorite_mealId_idx" ON "meal_favorite"("mealId");

-- CreateIndex
CREATE UNIQUE INDEX "provider_favorite_customerId_providerId_key" ON "provider_favorite"("customerId", "providerId");

-- CreateIndex
CREATE INDEX "provider_favorite_customerId_idx" ON "provider_favorite"("customerId");

-- CreateIndex
CREATE INDEX "provider_favorite_providerId_idx" ON "provider_favorite"("providerId");

-- AddForeignKey
ALTER TABLE "meal_favorite" ADD CONSTRAINT "meal_favorite_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_favorite" ADD CONSTRAINT "meal_favorite_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_favorite" ADD CONSTRAINT "provider_favorite_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_favorite" ADD CONSTRAINT "provider_favorite_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
