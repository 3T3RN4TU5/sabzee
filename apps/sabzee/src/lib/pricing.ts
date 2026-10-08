export interface Coupon {
  code: string;
  description: string;
  type: "percent" | "flat";
  value: number;
  minOrder: number;
  maxDiscount?: number;
}

export const coupons: Coupon[] = [
  { code: "SABZEE10", description: "10% off on orders above ₹299 (max ₹100)", type: "percent", value: 10, minOrder: 299, maxDiscount: 100 },
  { code: "FRESH50", description: "Flat ₹50 off on orders above ₹499", type: "flat", value: 50, minOrder: 499 },
  { code: "FIRSTBUY", description: "20% off your first order above ₹199 (max ₹150)", type: "percent", value: 20, minOrder: 199, maxDiscount: 150 },
];

export const FREE_DELIVERY_THRESHOLD = 499;
export const DELIVERY_FEE = 35;

export function couponDiscount(coupon: Coupon | undefined, subtotal: number): number {
  if (!coupon || subtotal < coupon.minOrder) return 0;
  const raw = coupon.type === "percent" ? (subtotal * coupon.value) / 100 : coupon.value;
  return Math.round(Math.min(raw, coupon.maxDiscount ?? Infinity));
}

export function computeTotals(subtotal: number, couponCode: string | null) {
  const coupon = coupons.find((c) => c.code === couponCode);
  const discount = couponDiscount(coupon, subtotal);
  const deliveryFee = subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  return {
    coupon,
    couponValid: coupon ? subtotal >= coupon.minOrder : false,
    discount,
    deliveryFee,
    total: Math.max(0, subtotal - discount + deliveryFee),
  };
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}
