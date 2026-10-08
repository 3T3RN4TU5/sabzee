"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banknote, CreditCard, Lock, Smartphone } from "lucide-react";
import { detailLines, useShop, type Address, type PaymentMethod } from "@/lib/store";
import { computeTotals } from "@/lib/pricing";
import { useMounted } from "@/lib/use-mounted";
import { OrderSummary } from "./OrderSummary";

const slots = ["Express · 30 min", "Today · 6–8 PM", "Tomorrow · 7–9 AM", "Tomorrow · 6–8 PM"];

const payments: { id: PaymentMethod; label: string; hint: string; icon: typeof Banknote }[] = [
  { id: "upi", label: "UPI", hint: "GPay, PhonePe, Paytm", icon: Smartphone },
  { id: "card", label: "Card", hint: "Credit / Debit (demo)", icon: CreditCard },
  { id: "cod", label: "Cash on delivery", hint: "Pay at your door", icon: Banknote },
];

type Errors = Partial<Record<keyof Address | "upi", string>>;

function validate(a: Address, payment: PaymentMethod, upi: string): Errors {
  const e: Errors = {};
  if (a.fullName.trim().length < 3) e.fullName = "Please enter your full name";
  if (!/^[6-9]\d{9}$/.test(a.phone)) e.phone = "Enter a valid 10-digit Indian mobile number";
  if (a.line1.trim().length < 8) e.line1 = "Please enter a complete address";
  if (a.city.trim().length < 2) e.city = "City is required";
  if (!/^[1-9]\d{5}$/.test(a.pincode)) e.pincode = "Enter a valid 6-digit pincode";
  if (payment === "upi" && !/^[\w.-]{2,}@[a-z]{2,}$/i.test(upi)) e.upi = "Enter a valid UPI ID (e.g. name@okaxis)";
  return e;
}

export function CheckoutView() {
  const mounted = useMounted();
  const router = useRouter();
  const cart = useShop((s) => s.cart);
  const couponCode = useShop((s) => s.couponCode);
  const placeOrder = useShop((s) => s.placeOrder);

  const [address, setAddress] = useState<Address>({ fullName: "", phone: "", line1: "", city: "", pincode: "" });
  const [slot, setSlot] = useState(slots[0]);
  const [payment, setPayment] = useState<PaymentMethod>("upi");
  const [upi, setUpi] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  if (!mounted) return <div className="mx-auto h-96 max-w-7xl animate-pulse px-4 py-8" />;

  const lines = detailLines(cart);
  if (lines.length === 0) {
    return (
      <div className="mx-auto grid max-w-xl place-items-center px-4 py-24 text-center">
        <span className="text-7xl">🧺</span>
        <h1 className="mt-6 text-2xl font-extrabold">Nothing to check out yet</h1>
        <Link href="/shop" className="mt-6 rounded-xl bg-brand-600 px-6 py-3 font-bold text-white">
          Go shopping
        </Link>
      </div>
    );
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const savings = lines.reduce((s, l) => s + (l.product.mrp - l.product.price) * l.qty, 0);

  function field(name: keyof Address) {
    return {
      id: name,
      name,
      value: address[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setAddress((a) => ({ ...a, [name]: e.target.value })),
      "aria-invalid": Boolean(errors[name]),
      className: `w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:ring-4 ${
        errors[name] ? "border-rose-400 focus:ring-rose-100" : "border-brand-100 focus:border-brand-400 focus:ring-brand-100"
      }`,
    };
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(address, payment, upi);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSubmitting(true);
    const totals = computeTotals(subtotal, couponCode);
    // Simulate a payment gateway round-trip.
    setTimeout(() => {
      placeOrder({
        lines: lines.map(({ product, qty }) => ({
          productId: product.id,
          name: product.name,
          emoji: product.emoji,
          unit: product.unit,
          price: product.price,
          qty,
        })),
        subtotal,
        discount: totals.discount,
        deliveryFee: totals.deliveryFee,
        total: totals.total,
        couponCode: totals.couponValid ? couponCode ?? undefined : undefined,
        address,
        slot,
        payment,
      });
      router.push("/orders?placed=1");
    }, 900);
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Checkout</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-brand-100 bg-white p-6">
            <h2 className="text-lg font-extrabold">1. Delivery address</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={errors.fullName}>
                <input {...field("fullName")} autoComplete="name" placeholder="Jeevan Kumar" />
              </Field>
              <Field label="Mobile number" error={errors.phone}>
                <input {...field("phone")} autoComplete="tel" inputMode="numeric" maxLength={10} placeholder="9876543210" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="House no., street, area" error={errors.line1}>
                  <input {...field("line1")} autoComplete="street-address" placeholder="Flat 402, Green Residency, MG Road" />
                </Field>
              </div>
              <Field label="City" error={errors.city}>
                <input {...field("city")} autoComplete="address-level2" placeholder="Pune" />
              </Field>
              <Field label="Pincode" error={errors.pincode}>
                <input {...field("pincode")} autoComplete="postal-code" inputMode="numeric" maxLength={6} placeholder="411001" />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-brand-100 bg-white p-6">
            <h2 className="text-lg font-extrabold">2. Delivery slot</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {slots.map((s) => (
                <label
                  key={s}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 text-sm font-semibold transition ${
                    slot === s ? "border-brand-500 bg-brand-50" : "border-brand-100 hover:border-brand-200"
                  }`}
                >
                  <input type="radio" name="slot" value={s} checked={slot === s} onChange={() => setSlot(s)} className="accent-brand-600" />
                  {s}
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-brand-100 bg-white p-6">
            <h2 className="text-lg font-extrabold">3. Payment</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {payments.map(({ id, label, hint, icon: Icon }) => (
                <label
                  key={id}
                  className={`flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-4 transition ${
                    payment === id ? "border-brand-500 bg-brand-50" : "border-brand-100 hover:border-brand-200"
                  }`}
                >
                  <input type="radio" name="payment" value={id} checked={payment === id} onChange={() => setPayment(id)} className="sr-only" />
                  <Icon className="h-5 w-5 text-brand-600" />
                  <span className="text-sm font-bold">{label}</span>
                  <span className="text-xs text-ink/60">{hint}</span>
                </label>
              ))}
            </div>
            {payment === "upi" && (
              <div className="mt-4 max-w-sm">
                <Field label="UPI ID" error={errors.upi}>
                  <input
                    id="upi"
                    value={upi}
                    onChange={(e) => setUpi(e.target.value)}
                    placeholder="yourname@okaxis"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none ${errors.upi ? "border-rose-400" : "border-brand-100 focus:border-brand-400"}`}
                  />
                </Field>
              </div>
            )}
            {payment === "card" && (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800">
                This is a demo store — card payments are simulated and no card details are collected.
              </p>
            )}
          </section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-2xl border border-brand-100 bg-white p-5">
            <h2 className="font-extrabold">Items ({lines.length})</h2>
            <ul className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
              {lines.map(({ product, qty, lineTotal }) => (
                <li key={product.id} className="flex items-center gap-3 text-sm">
                  <span className="grid h-9 w-9 place-items-center rounded-lg text-xl" style={{ backgroundColor: product.tint }}>
                    {product.emoji}
                  </span>
                  <span className="flex-1">
                    {product.name} <span className="text-ink/50">× {qty}</span>
                  </span>
                  <span className="font-semibold">₹{lineTotal}</span>
                </li>
              ))}
            </ul>
          </div>
          <OrderSummary subtotal={subtotal} savings={savings} couponCode={couponCode}>
            <button
              type="submit"
              disabled={submitting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 font-bold text-white transition hover:bg-brand-700 disabled:opacity-70"
            >
              <Lock className="h-4 w-4" />
              {submitting ? "Placing order…" : "Place order"}
            </button>
          </OrderSummary>
        </div>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold tracking-wide text-ink/60 uppercase">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-semibold text-rose-600">{error}</span>}
    </label>
  );
}
