import { PaymentMethod, PaymentStatus } from '@prisma/client';

export const PLATFORM_FEE_RATE = 0.15;
export const STRIPE_CUSTOMER_CHARGE_MULTIPLIER = 1.1;
export const STRIPE_GATEWAY_PERCENT = 0.029;
export const STRIPE_GATEWAY_FIXED = 0.3;

const toMoney = (value: number) => Number(value.toFixed(2));

export const isSettledPaymentStatus = (paymentStatus: PaymentStatus) => {
  return paymentStatus === PaymentStatus.PAID || paymentStatus === PaymentStatus.COD_COLLECTED;
};

export const calculateStripeGatewayFee = (customerPaidAmount: number) => {
  return toMoney(customerPaidAmount * STRIPE_GATEWAY_PERCENT + STRIPE_GATEWAY_FIXED);
};

export const computeOrderFinancialSnapshot = ({
  totalPrice,
  discountAmount,
  paymentMethod,
  couponProviderId,
  customerPaidAmount,
  platformFeeRate = PLATFORM_FEE_RATE,
  refundCostToAdmin = 0,
  refundCostToProvider = 0,
}: {
  totalPrice: number;
  discountAmount: number;
  paymentMethod: PaymentMethod;
  couponProviderId?: string | null;
  customerPaidAmount?: number;
  platformFeeRate?: number;
  refundCostToAdmin?: number;
  refundCostToProvider?: number;
}) => {
  const normalizedTotalPrice = toMoney(Math.max(0, totalPrice));
  const normalizedDiscountAmount = toMoney(Math.max(0, discountAmount));

  const resolvedCustomerPaidAmount =
    typeof customerPaidAmount === 'number'
      ? toMoney(Math.max(0, customerPaidAmount))
      : paymentMethod === PaymentMethod.STRIPE
      ? toMoney(normalizedTotalPrice * STRIPE_CUSTOMER_CHARGE_MULTIPLIER)
      : normalizedTotalPrice;

  const platformFeeAmount = toMoney(normalizedTotalPrice * platformFeeRate);
  const serviceFeeAmount =
    paymentMethod === PaymentMethod.STRIPE
      ? toMoney(Math.max(0, resolvedCustomerPaidAmount - normalizedTotalPrice))
      : 0;

  const paymentGatewayFeeAmount =
    paymentMethod === PaymentMethod.STRIPE ? calculateStripeGatewayFee(resolvedCustomerPaidAmount) : 0;

  const isProviderFundedCoupon = Boolean(couponProviderId);
  const adminCouponSubsidyAmount = isProviderFundedCoupon ? 0 : normalizedDiscountAmount;
  const providerCouponShareAmount = isProviderFundedCoupon ? normalizedDiscountAmount : 0;

  const providerGrossEarning = toMoney(normalizedTotalPrice - platformFeeAmount);
  const adminGrossRevenue = toMoney(platformFeeAmount + serviceFeeAmount);

  const adminNetRevenue = toMoney(
    adminGrossRevenue - paymentGatewayFeeAmount - adminCouponSubsidyAmount - refundCostToAdmin
  );
  const providerNetPayout = toMoney(providerGrossEarning - providerCouponShareAmount - refundCostToProvider);

  return {
    platformFeeRate: toMoney(platformFeeRate),
    platformFeeAmount,
    serviceFeeAmount,
    paymentGatewayFeeAmount,
    adminCouponSubsidyAmount,
    providerCouponShareAmount,
    refundCostToAdmin: toMoney(refundCostToAdmin),
    refundCostToProvider: toMoney(refundCostToProvider),
    adminGrossRevenue,
    adminNetRevenue,
    providerGrossEarning,
    providerNetPayout,
    customerPaidAmount: resolvedCustomerPaidAmount,
  };
};
