import Link from "next/link";
import { Star } from "lucide-react";
import { discountPercent, type Product } from "@/lib/products";
import { formatINR } from "@/lib/pricing";
import { AddToCart, WishlistButton } from "./CartControls";

export function ProductCard({ product }: { product: Product }) {
  const off = discountPercent(product);

  return (
    <article className="group relative flex flex-col rounded-2xl border border-brand-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-900/5">
      <Link href={`/product/${product.slug}`} className="relative block">
        <div
          className="grid aspect-square place-items-center rounded-xl text-7xl transition group-hover:scale-[1.02]"
          style={{ backgroundColor: product.tint }}
        >
          <span className="drop-shadow-sm transition duration-300 group-hover:scale-110">{product.emoji}</span>
        </div>
        {off > 0 && (
          <span className="absolute top-2 left-2 rounded-lg bg-brand-600 px-2 py-0.5 text-[11px] font-extrabold text-white">
            {off}% OFF
          </span>
        )}
        {product.organic && (
          <span className="absolute bottom-2 left-2 rounded-lg bg-white/90 px-2 py-0.5 text-[10px] font-bold text-brand-700">
            🌱 ORGANIC
          </span>
        )}
      </Link>
      <WishlistButton product={product} className="absolute top-5 right-5" />

      <div className="mt-3 flex flex-1 flex-col">
        <p className="text-[11px] font-semibold tracking-wide text-ink/50 uppercase">{product.unit}</p>
        <Link href={`/product/${product.slug}`} className="mt-0.5 leading-snug font-bold text-ink hover:text-brand-700">
          {product.name}
          <span className="block text-xs font-medium text-ink/50">{product.hindiName}</span>
        </Link>
        <div className="mt-1.5 flex items-center gap-1 text-xs text-ink/60">
          <Star className="h-3.5 w-3.5 fill-saffron-400 text-saffron-400" />
          <span className="font-semibold text-ink/80">{product.rating}</span>
          <span>({product.reviews.toLocaleString("en-IN")})</span>
        </div>
        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <p className="text-base font-extrabold">{formatINR(product.price)}</p>
            {product.mrp > product.price && (
              <p className="text-xs text-ink/40 line-through">{formatINR(product.mrp)}</p>
            )}
          </div>
          <AddToCart product={product} />
        </div>
      </div>
    </article>
  );
}
