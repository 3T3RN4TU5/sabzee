"use client";

import Link from "next/link";
import { useState } from "react";
import { Tag, Trash2 } from "lucide-react";
import { detailLines, useShop } from "@/lib/store";
import { coupons, formatINR } from "@/lib/pricing";
import { useMounted } from "@/lib/use-mounted";
import { useToasts } from "@/lib/toast";
import { AddToCart } from "./CartControls";
import { OrderSummary } from "./OrderSummary";

export function CartView() {
  const mounted = useMounted();
  const cart = useShop((s) => s.cart);
  const couponCode = useShop((s) => s.couponCode);
  const applyCoupon = useShop((s) => s.applyCoupon);
  const removeCoupon = useShop((s) => s.removeCoupon);
  const removeFromCart = useShop((s) => s.removeFromCart);
  const clearCart = useShop((s) => s.clearCart);
  const toast = useToasts((s) => s.push);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  if (!mounted) {
    return <div className="mx-auto h-96 max-w-7xl animate-pulse px-4 py-8" />;
  }

  const lines = detailLines(cart);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const savings = lines.reduce((s, l) => s + (l.product.mrp - l.product.price) * l.qty, 0);

  if (lines.length === 0) {
    return (
      <div className="mx-auto grid max-w-xl place-items-center px-4 py-24 text-center">
        <span className="text-8xl">🛒</span>
        <h1 className="mt-6 text-3xl font-extrabold">Your cart is empty</h1>
        <p className="mt-2 text-ink/60">Fresh sabzi is just a tap away. Let&apos;s fill this basket!</p>
        <Link href="/shop" className="mt-8 rounded-xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700">
          Browse products
        </Link>
      </div>
    );
  }

  function submitCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    const coupon = applyCoupon(code);
    if (coupon) {
      setError("");
      setCode("");
      toast(`${coupon.code} applied!`, "🏷️");
    } else {
      setError("That coupon code isn't valid.");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-end justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Your cart <span className="text-ink/40">({lines.reduce((n, l) => n + l.qty, 0)})</span>
        </h1>
        <button type="button" onClick={clearCart} className="text-sm font-semibold text-rose-600 hover:underline">
          Clear cart
        </button>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <ul className="divide-y divide-brand-100 rounded-2xl border border-brand-100 bg-white">
          {lines.map(({ product, qty, lineTotal }) => (
            <li key={product.id} className="flex items-center gap-4 p-4">
              <Link
                href={`/product/${product.slug}`}
                className="grid h-20 w-20 shrink-0 place-items-center rounded-xl text-4xl"
                style={{ backgroundColor: product.tint }}
              >
                {product.emoji}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/product/${product.slug}`} className="font-bold hover:text-brand-700">
                  {product.name}
                </Link>
                <p className="text-xs text-ink/50">{product.unit}</p>
                <p className="mt-1 text-sm">
                  <span className="font-bold">{formatINR(product.price)}</span>{" "}
                  <span className="text-xs text-ink/40 line-through">{formatINR(product.mrp)}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <AddToCart product={product} />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold">{formatINR(lineTotal)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${product.name}`}
                    onClick={() => removeFromCart(product.id)}
                    className="rounded-lg p-1.5 text-ink/40 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {qty >= 10 && <span className="text-[10px] font-semibold text-orange-600">Max 10 per item</span>}
              </div>
            </li>
          ))}
        </ul>

        <div className="space-y-4">
          <div className="rounded-2xl border border-brand-100 bg-white p-5">
            <h2 className="flex items-center gap-2 font-extrabold">
              <Tag className="h-4 w-4 text-brand-600" /> Coupons
            </h2>
            {couponCode ? (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5">
                <span className="text-sm font-bold text-brand-800">{couponCode} applied</span>
                <button type="button" onClick={removeCoupon} className="text-xs font-semibold text-rose-600">
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={submitCoupon} className="mt-3 flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter coupon code"
                  aria-label="Coupon code"
                  className="min-w-0 flex-1 rounded-xl border border-brand-100 px-3 py-2 text-sm uppercase outline-none focus:border-brand-400"
                />
                <button type="submit" className="rounded-xl bg-ink px-4 py-2 text-sm font-bold text-white">
                  Apply
                </button>
              </form>
            )}
            {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {coupons.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  title={c.description}
                  onClick={() => {
                    applyCoupon(c.code);
                    setError("");
                    toast(`${c.code} applied!`, "🏷️");
                  }}
                  className="rounded-lg border border-dashed border-brand-300 px-2 py-1 text-xs font-bold text-brand-700 hover:bg-brand-50"
                >
                  {c.code}
                </button>
              ))}
            </div>
          </div>

          <OrderSummary subtotal={subtotal} savings={savings} couponCode={couponCode}>
            <Link
              href="/checkout"
              className="mt-5 block rounded-xl bg-brand-600 py-3.5 text-center font-bold text-white transition hover:bg-brand-700"
            >
              Proceed to checkout →
            </Link>
          </OrderSummary>
        </div>
      </div>
    </div>
  );
}
