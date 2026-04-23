-- AlterTable
ALTER TABLE "order"
ADD COLUMN     "platformFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
ADD COLUMN     "platformFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "serviceFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "paymentGatewayFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "adminCouponSubsidyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "providerCouponShareAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "refundCostToAdmin" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "refundCostToProvider" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "adminGrossRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "adminNetRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "providerGrossEarning" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "providerNetPayout" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "customerPaidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

WITH computed AS (
  SELECT
    o."id",
    ROUND((o."totalPrice" * 0.15)::numeric, 2)::double precision AS "platformFeeAmount",
    CASE
      WHEN o."paymentMethod" = 'STRIPE' THEN ROUND((o."totalPrice" * 0.10)::numeric, 2)::double precision
      ELSE 0
    END AS "serviceFeeAmount",
    CASE
      WHEN o."paymentMethod" = 'STRIPE' THEN ROUND((o."totalPrice" * 1.10)::numeric, 2)::double precision
      ELSE o."totalPrice"
    END AS "customerPaidAmount",
    CASE
      WHEN o."paymentMethod" = 'STRIPE' THEN ROUND((((ROUND((o."totalPrice" * 1.10)::numeric, 2)::double precision) * 0.029) + 0.30)::numeric, 2)::double precision
      ELSE 0
    END AS "paymentGatewayFeeAmount",
    CASE
      WHEN o."couponId" IS NOT NULL AND c."providerId" IS NOT NULL THEN o."discountAmount"
      ELSE 0
    END AS "providerCouponShareAmount",
    CASE
      WHEN o."couponId" IS NULL OR c."providerId" IS NULL THEN o."discountAmount"
      ELSE 0
    END AS "adminCouponSubsidyAmount"
  FROM "order" o
  LEFT JOIN "coupon" c ON c."id" = o."couponId"
),
computed_totals AS (
  SELECT
    "id",
    "platformFeeAmount",
    "serviceFeeAmount",
    "customerPaidAmount",
    "paymentGatewayFeeAmount",
    "providerCouponShareAmount",
    "adminCouponSubsidyAmount",
    ROUND(("platformFeeAmount" + "serviceFeeAmount")::numeric, 2)::double precision AS "adminGrossRevenue",
    ROUND(("platformFeeAmount" + "serviceFeeAmount" - "paymentGatewayFeeAmount" - "adminCouponSubsidyAmount")::numeric, 2)::double precision AS "adminNetRevenue",
    ROUND(("customerPaidAmount" - "serviceFeeAmount" - "platformFeeAmount")::numeric, 2)::double precision AS "providerGrossEarning",
    ROUND(("customerPaidAmount" - "serviceFeeAmount" - "platformFeeAmount" - "providerCouponShareAmount")::numeric, 2)::double precision AS "providerNetPayout"
  FROM computed
)
UPDATE "order" o
SET
  "platformFeeRate" = 0.15,
  "platformFeeAmount" = ct."platformFeeAmount",
  "serviceFeeAmount" = ct."serviceFeeAmount",
  "customerPaidAmount" = ct."customerPaidAmount",
  "paymentGatewayFeeAmount" = ct."paymentGatewayFeeAmount",
  "providerCouponShareAmount" = ct."providerCouponShareAmount",
  "adminCouponSubsidyAmount" = ct."adminCouponSubsidyAmount",
  "adminGrossRevenue" = ct."adminGrossRevenue",
  "adminNetRevenue" = ct."adminNetRevenue",
  "providerGrossEarning" = ct."providerGrossEarning",
  "providerNetPayout" = ct."providerNetPayout"
FROM computed_totals ct
WHERE o."id" = ct."id";
