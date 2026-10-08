"use client";

import { Heart, Minus, Plus } from "lucide-react";
import { useShop } from "@/lib/store";
import { useToasts } from "@/lib/toast";
import { useMounted } from "@/lib/use-mounted";
import type { Product } from "@/lib/products";

export function AddToCart({ product, size = "sm" }: { product: Product; size?: "sm" | "lg" }) {
  const mounted = useMounted();
  const qty = useShop((s) => s.cart.find((l) => l.productId === product.id)?.qty ?? 0);
  const addToCart = useShop((s) => s.addToCart);
  const setQty = useShop((s) => s.setQty);
  const toast = useToasts((s) => s.push);

  const big = size === "lg";

  if (mounted && qty > 0) {
    return (
      <div
        className={`flex items-center justify-between rounded-xl bg-brand-600 font-bold text-white ${
          big ? "h-12 w-44 text-base" : "h-9 w-24 text-sm"
        }`}
      >
        <button
          type="button"
          aria-label={`Decrease ${product.name}`}
          onClick={() => setQty(product.id, qty - 1)}
          className="grid h-full flex-1 place-items-center rounded-l-xl hover:bg-brand-700"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-6 text-center tabular-nums">{qty}</span>
        <button
          type="button"
          aria-label={`Increase ${product.name}`}
          onClick={() => setQty(product.id, qty + 1)}
          disabled={qty >= 10}
          className="grid h-full flex-1 place-items-center rounded-r-xl hover:bg-brand-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        addToCart(product.id);
        toast(`${product.name} added to cart`, product.emoji);
      }}
      className={`rounded-xl border-2 border-brand-500 bg-white font-bold text-brand-700 uppercase transition hover:bg-brand-500 hover:text-white ${
        big ? "h-12 w-44 text-base" : "h-9 w-24 text-xs"
      }`}
    >
      Add
    </button>
  );
}

export function WishlistButton({ product, className = "" }: { product: Product; className?: string }) {
  const mounted = useMounted();
  const liked = useShop((s) => s.wishlist.includes(product.id));
  const toggle = useShop((s) => s.toggleWishlist);
  const toast = useToasts((s) => s.push);
  const active = mounted && liked;

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      onClick={() => {
        toggle(product.id);
        toast(active ? "Removed from wishlist" : "Saved to wishlist", active ? "💔" : "💚");
      }}
      className={`grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm transition hover:scale-110 ${className}`}
    >
      <Heart className={`h-4.5 w-4.5 ${active ? "fill-rose-500 text-rose-500" : "text-ink/50"}`} />
    </button>
  );
}
