"use client";

import { FREE_DELIVERY_THRESHOLD, computeTotals, formatINR } from "@/lib/pricing";

export function OrderSummary({
  subtotal,
  savings,
  couponCode,
  children,
}: {
  subtotal: number;
  savings: number;
  couponCode: string | null;
  children?: React.ReactNode;
}) {
  const { discount, deliveryFee, total, coupon, couponValid } = computeTotals(subtotal, couponCode);
  const remaining = FREE_DELIVERY_THRESHOLD - subtotal;

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-extrabold">Bill details</h2>
      {remaining > 0 && (
        <div className="mt-4 rounded-xl bg-saffron-400/15 p-3 text-xs font-semibold text-orange-800">
          Add {formatINR(remaining)} more for FREE delivery 🚚
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-orange-200">
            <div className="h-full rounded-full bg-saffron-500" style={{ width: `${Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100)}%` }} />
          </div>
        </div>
      )}
      <dl className="mt-4 space-y-2.5 text-sm">
        <Row label="Item total" value={formatINR(subtotal)} />
        <Row label="Product savings" value={`− ${formatINR(savings)}`} accent />
        {coupon && (
          <Row
            label={`Coupon ${coupon.code}${couponValid ? "" : ` (min ${formatINR(coupon.minOrder)})`}`}
            value={couponValid ? `− ${formatINR(discount)}` : "—"}
            accent={couponValid}
          />
        )}
        <Row label="Delivery fee" value={deliveryFee === 0 ? "FREE" : formatINR(deliveryFee)} accent={deliveryFee === 0} />
        <div className="border-t border-dashed border-brand-200 pt-3">
          <Row label="To pay" value={formatINR(total)} strong />
        </div>
      </dl>
      {savings + discount > 0 && (
        <p className="mt-4 rounded-xl bg-brand-50 px-3 py-2 text-center text-xs font-bold text-brand-700">
          🎉 You save {formatINR(savings + discount)} on this order
        </p>
      )}
      {children}
    </div>
  );
}

function Row({ label, value, accent, strong }: { label: string; value: string; accent?: boolean; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-base font-extrabold" : ""}`}>
      <dt className={strong ? "" : "text-ink/70"}>{label}</dt>
      <dd className={accent ? "font-semibold text-brand-700" : "font-semibold"}>{value}</dd>
    </div>
  );
}
