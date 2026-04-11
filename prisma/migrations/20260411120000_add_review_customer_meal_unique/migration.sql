-- CreateIndex
CREATE UNIQUE INDEX "review_customerId_mealId_key" ON "review"("customerId", "mealId");
