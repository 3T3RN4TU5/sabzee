"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCcw } from "lucide-react";
import { useShop, type Order } from "@/lib/store";
import { formatINR } from "@/lib/pricing";
import { useMounted } from "@/lib/use-mounted";
import { useToasts } from "@/lib/toast";

const stages = [
  { label: "Order placed", after: 0 },
  { label: "Packed", after: 2 * 60_000 },
  { label: "Out for delivery", after: 8 * 60_000 },
  { label: "Delivered", after: 25 * 60_000 },
];

function stageIndex(order: Order, now: number) {
  const elapsed = now - order.createdAt;
  return stages.reduce((idx, s, i) => (elapsed >= s.after ? i : idx), 0);
}

export function OrdersView() {
  const mounted = useMounted();
  const orders = useShop((s) => s.orders);
  const addToCart = useShop((s) => s.addToCart);
  const toast = useToasts((s) => s.push);
  const justPlaced = useSearchParams().get("placed") === "1";
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  if (!mounted) return <div className="mx-auto h-96 max-w-4xl animate-pulse px-4 py-8" />;

  if (orders.length === 0) {
    return (
      <div className="mx-auto grid max-w-xl place-items-center px-4 py-24 text-center">
        <span className="text-8xl">📦</span>
        <h1 className="mt-6 text-3xl font-extrabold">No orders yet</h1>
        <p className="mt-2 text-ink/60">Your order history will show up here.</p>
        <Link href="/shop" className="mt-8 rounded-xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700">
          Place your first order
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {justPlaced && (
        <div className="mb-8 flex items-center gap-4 rounded-2xl bg-brand-600 p-5 text-white shadow-lg">
          <CheckCircle2 className="h-10 w-10 shrink-0" />
          <div>
            <p className="text-lg font-extrabold">Order placed successfully! 🎉</p>
            <p className="text-sm text-brand-50/90">
              Order #{orders[0].id} · {orders[0].slot}. You can track it below.
            </p>
          </div>
        </div>
      )}
      <h1 className="text-3xl font-extrabold tracking-tight">My orders</h1>
      <ul className="mt-6 space-y-5">
        {orders.map((order) => {
          const current = stageIndex(order, now);
          return (
            <li key={order.id} className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold">Order #{order.id}</p>
                  <p className="text-xs text-ink/50">
                    {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {order.slot} ·{" "}
                    {order.payment.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold">{formatINR(order.total)}</p>
                  {order.couponCode && <p className="text-xs font-semibold text-brand-700">{order.couponCode} applied</p>}
                </div>
              </div>

              <ol className="mt-5 grid grid-cols-4 gap-2">
                {stages.map((s, i) => (
                  <li key={s.label} className="text-center">
                    <div className={`h-1.5 rounded-full ${i <= current ? "bg-brand-500" : "bg-brand-100"}`} />
                    <p className={`mt-2 text-[11px] font-semibold ${i <= current ? "text-brand-700" : "text-ink/40"}`}>{s.label}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-5 flex flex-wrap gap-2">
                {order.lines.map((l) => (
                  <span key={l.productId} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold">
                    {l.emoji} {l.name} × {l.qty}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 pt-4 text-xs text-ink/60">
                <span>
                  Deliver to <span className="font-semibold text-ink">{order.address.fullName}</span>, {order.address.city} {order.address.pincode}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    order.lines.forEach((l) => addToCart(l.productId, l.qty));
                    toast("Items added to cart", "🔁");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 font-bold text-brand-700 hover:bg-brand-50"
                >
                  <RefreshCcw className="h-3.5 w-3.5" /> Reorder
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
