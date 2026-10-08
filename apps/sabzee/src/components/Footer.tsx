import Link from "next/link";
import { categories } from "@/lib/products";

export function Footer() {
  return (
    <footer className="mt-16 bg-brand-900 text-brand-100">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-2xl">🥬</span>
            <span className="text-xl font-extrabold text-white">sabzee.</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-brand-200/80">
            Farm-fresh vegetables and fruits sourced directly from 1,200+ Indian farmers and delivered to your door in 30 minutes.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-wide text-white uppercase">Shop</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/shop?category=${c.id}`} className="hover:text-white">
                  {c.emoji} {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-wide text-white uppercase">Account</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/cart" className="hover:text-white">Cart</Link></li>
            <li><Link href="/wishlist" className="hover:text-white">Wishlist</Link></li>
            <li><Link href="/orders" className="hover:text-white">Order history</Link></li>
            <li><Link href="/api/products" className="hover:text-white">Products API</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-wide text-white uppercase">Promise</h3>
          <ul className="mt-4 space-y-2 text-sm text-brand-200/80">
            <li>✅ No-questions-asked returns</li>
            <li>🌱 Chemical-free sourcing</li>
            <li>⏱️ 30-minute delivery slots</li>
            <li>💳 COD, UPI &amp; cards accepted</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-brand-200/70">
        © Sabzee · A portfolio project built with Next.js, TypeScript, Tailwind CSS &amp; Zustand. Demo store — no real orders are placed.
      </div>
    </footer>
  );
}
