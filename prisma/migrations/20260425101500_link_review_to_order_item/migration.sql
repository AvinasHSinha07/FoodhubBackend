-- Add nullable orderItemId first so existing reviews remain valid
ALTER TABLE "review"
ADD COLUMN IF NOT EXISTS "orderItemId" TEXT;

-- Drop old lifetime uniqueness (one review per customer+meal forever)
DROP INDEX IF EXISTS "review_customerId_mealId_key";

-- Enforce one review per purchased order item (NULLs allowed for legacy rows)
CREATE UNIQUE INDEX IF NOT EXISTS "review_orderItemId_key" ON "review"("orderItemId");

-- Link review rows to the exact purchased order item
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'review_orderItemId_fkey'
	) THEN
		ALTER TABLE "review"
		ADD CONSTRAINT "review_orderItemId_fkey"
		FOREIGN KEY ("orderItemId") REFERENCES "order_item"("id")
		ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;
END $$;
