"use client";

import Link from "next/link";
import { products } from "@/lib/products";
import { useShop } from "@/lib/store";
import { useMounted } from "@/lib/use-mounted";
import { ProductCard } from "./ProductCard";

export function WishlistView() {
  const mounted = useMounted();
  const wishlist = useShop((s) => s.wishlist);

  if (!mounted) return <div className="mx-auto h-96 max-w-7xl animate-pulse px-4 py-8" />;

  const items = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">
        Wishlist <span className="text-ink/40">({items.length})</span>
      </h1>
      {items.length === 0 ? (
        <div className="mt-10 grid place-items-center rounded-2xl border border-dashed border-brand-200 bg-white py-20 text-center">
          <span className="text-7xl">💚</span>
          <p className="mt-4 text-lg font-bold">Save your favourites here</p>
          <p className="mt-1 text-sm text-ink/60">Tap the heart on any product to add it to your wishlist.</p>
          <Link href="/shop" className="mt-6 rounded-xl bg-brand-600 px-6 py-3 font-bold text-white">
            Explore products
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
