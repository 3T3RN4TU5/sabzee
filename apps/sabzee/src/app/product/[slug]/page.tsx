import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MapPin, RotateCcw, ShieldCheck, Star, Timer } from "lucide-react";
import { discountPercent, getCategory, getProduct, getRelated, products } from "@/lib/products";
import { formatINR } from "@/lib/pricing";
import { AddToCart, WishlistButton } from "@/components/CartControls";
import { ProductCard } from "@/components/ProductCard";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: `${product.name} (${product.hindiName})`,
    description: product.description,
  };
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const category = getCategory(product.category);
  const related = getRelated(product);
  const off = discountPercent(product);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-ink/60">
        <Link href="/" className="hover:text-brand-700">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/shop?category=${product.category}`} className="hover:text-brand-700">{category?.name}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-semibold text-ink">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="relative">
          <div
            className="grid aspect-square place-items-center rounded-3xl text-[10rem] shadow-inner md:text-[13rem]"
            style={{ backgroundColor: product.tint }}
          >
            <span className="animate-float drop-shadow-2xl">{product.emoji}</span>
          </div>
          <WishlistButton product={product} className="absolute top-5 right-5 h-11 w-11" />
          {product.organic && (
            <span className="absolute top-5 left-5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-brand-700 shadow-sm">
              🌱 Certified organic
            </span>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-brand-700">{category?.emoji} {category?.name}</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">{product.name}</h1>
          <p className="mt-1 text-lg text-ink/50">{product.hindiName}</p>

          <div className="mt-4 flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2 py-1 font-bold text-white">
              {product.rating} <Star className="h-3.5 w-3.5 fill-white" />
            </span>
            <span className="text-ink/60">{product.reviews.toLocaleString("en-IN")} ratings</span>
            <span className="text-ink/30">|</span>
            <span className={product.stock < 30 ? "font-semibold text-orange-600" : "text-brand-700"}>
              {product.stock < 30 ? `Only ${product.stock} left!` : "In stock"}
            </span>
          </div>

          <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-5">
            <p className="text-sm text-ink/60">{product.unit}</p>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-4xl font-extrabold">{formatINR(product.price)}</span>
              {off > 0 && (
                <>
                  <span className="text-lg text-ink/40 line-through">{formatINR(product.mrp)}</span>
                  <span className="rounded-lg bg-brand-50 px-2 py-0.5 text-sm font-bold text-brand-700">{off}% OFF</span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-ink/50">Inclusive of all taxes</p>
            <div className="mt-5">
              <AddToCart product={product} size="lg" />
            </div>
          </div>

          <p className="mt-6 leading-relaxed text-ink/80">{product.description}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Timer, label: "30-min delivery" },
              { icon: RotateCcw, label: "Easy returns" },
              { icon: ShieldCheck, label: "Quality assured" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-800">
                <Icon className="h-4 w-4" /> {label}
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-ink/70">
            <MapPin className="h-4 w-4 text-brand-600" /> Sourced from <span className="font-semibold text-ink">{product.origin}</span>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-bold tracking-wider text-ink/50 uppercase">Nutrition per 100 g</h2>
            <dl className="mt-3 grid grid-cols-4 gap-3">
              {[
                ["Calories", `${product.nutrition.calories}`, "kcal"],
                ["Carbs", `${product.nutrition.carbs}`, "g"],
                ["Protein", `${product.nutrition.protein}`, "g"],
                ["Fiber", `${product.nutrition.fiber}`, "g"],
              ].map(([label, value, unit]) => (
                <div key={label} className="rounded-xl border border-brand-100 bg-white p-3 text-center">
                  <dd className="text-lg font-extrabold">
                    {value}
                    <span className="text-xs font-semibold text-ink/50">{unit}</span>
                  </dd>
                  <dt className="text-xs text-ink/60">{label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-extrabold">You might also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
