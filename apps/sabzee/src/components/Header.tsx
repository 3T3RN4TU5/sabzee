"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Heart, Menu, Package, Search, ShoppingBag, X } from "lucide-react";
import { useShop } from "@/lib/store";
import { useMounted } from "@/lib/use-mounted";

const nav = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/shop?tag=deal", label: "Deals" },
  { href: "/orders", label: "My Orders" },
];

export function Header() {
  const mounted = useMounted();
  const cartCount = useShop((s) => s.cart.reduce((n, l) => n + l.qty, 0));
  const wishCount = useShop((s) => s.wishlist.length);
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    router.push(query.trim() ? `/shop?q=${encodeURIComponent(query.trim())}` : "/shop");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/90 backdrop-blur">
      <div className="bg-brand-700 px-4 py-1.5 text-center text-xs font-medium text-brand-50">
        🚚 Free delivery on orders above ₹499 · Use code <span className="font-bold">FIRSTBUY</span> for 20% off
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2" onClick={() => setOpen(false)}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-2xl shadow-sm">🥬</span>
          <span className="text-xl font-extrabold tracking-tight text-brand-800">
            sabzee<span className="text-saffron-500">.</span>
          </span>
        </Link>

        <form onSubmit={submit} className="relative hidden flex-1 md:block">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-brand-700/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for tomato, palak, mango…"
            aria-label="Search products"
            className="w-full rounded-xl border border-brand-100 bg-brand-50/60 py-2.5 pr-4 pl-10 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100"
          />
        </form>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => {
            const active = item.href === pathname;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  active ? "bg-brand-50 text-brand-700" : "text-ink/70 hover:bg-brand-50 hover:text-brand-700"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link href="/wishlist" aria-label="Wishlist" className="relative rounded-xl p-2.5 text-ink/70 transition hover:bg-brand-50 hover:text-brand-700">
            <Heart className="h-5 w-5" />
            {mounted && wishCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {wishCount}
              </span>
            )}
          </Link>
          <Link href="/orders" aria-label="Orders" className="rounded-xl p-2.5 text-ink/70 transition hover:bg-brand-50 hover:text-brand-700 lg:hidden">
            <Package className="h-5 w-5" />
          </Link>
          <Link
            href="/cart"
            className="relative flex items-center gap-2 rounded-xl bg-brand-600 px-3.5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700"
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="hidden sm:inline">Cart</span>
            {mounted && cartCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-saffron-400 px-1 text-[11px] font-extrabold text-ink">
                {cartCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="rounded-xl p-2.5 text-ink/70 hover:bg-brand-50 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-brand-100 bg-white px-4 pb-4 lg:hidden">
          <form onSubmit={submit} className="relative mt-3 md:hidden">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-brand-700/50" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="w-full rounded-xl border border-brand-100 bg-brand-50/60 py-2.5 pr-4 pl-10 text-sm outline-none focus:border-brand-400"
            />
          </form>
          <div className="mt-2 grid gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-ink/80 hover:bg-brand-50"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
