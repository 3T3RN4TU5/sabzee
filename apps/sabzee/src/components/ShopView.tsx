"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { categories, discountPercent, products, type Product } from "@/lib/products";
import { formatINR } from "@/lib/pricing";
import { ProductCard } from "./ProductCard";

const sorts = {
  popular: { label: "Popularity", fn: (a: Product, b: Product) => b.reviews - a.reviews },
  "price-asc": { label: "Price: Low to High", fn: (a: Product, b: Product) => a.price - b.price },
  "price-desc": { label: "Price: High to Low", fn: (a: Product, b: Product) => b.price - a.price },
  rating: { label: "Top rated", fn: (a: Product, b: Product) => b.rating - a.rating },
  discount: { label: "Biggest discount", fn: (a: Product, b: Product) => discountPercent(b) - discountPercent(a) },
} as const;

type SortKey = keyof typeof sorts;

const tagLabels: Record<string, string> = {
  deal: "Deals",
  bestseller: "Bestsellers",
  seasonal: "Seasonal",
  new: "New arrivals",
};

const MAX_PRICE = Math.max(...products.map((p) => p.price));

export function ShopView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [showFilters, setShowFilters] = useState(false);

  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const tag = params.get("tag") ?? "";
  const organic = params.get("organic") === "1";
  const sort = (params.get("sort") as SortKey) in sorts ? (params.get("sort") as SortKey) : "popular";
  const maxPrice = Number(params.get("max")) || MAX_PRICE;

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products
      .filter((p) => !category || p.category === category)
      .filter((p) => !tag || p.tags.includes(tag as Product["tags"][number]))
      .filter((p) => !organic || p.organic)
      .filter((p) => p.price <= maxPrice)
      .filter(
        (p) =>
          !needle ||
          p.name.toLowerCase().includes(needle) ||
          p.hindiName.toLowerCase().includes(needle) ||
          p.category.includes(needle),
      )
      .sort(sorts[sort].fn);
  }, [q, category, tag, organic, maxPrice, sort]);

  const activeCategory = categories.find((c) => c.id === category);
  const hasFilters = Boolean(q || category || tag || organic || maxPrice < MAX_PRICE);

  const filters = (
    <div className="space-y-7">
      <div>
        <h3 className="text-xs font-bold tracking-wider text-ink/50 uppercase">Category</h3>
        <div className="mt-3 grid gap-1">
          <FilterButton active={!category} onClick={() => update({ category: null })}>
            🧺 All produce
          </FilterButton>
          {categories.map((c) => (
            <FilterButton key={c.id} active={category === c.id} onClick={() => update({ category: c.id })}>
              {c.emoji} {c.name}
            </FilterButton>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-bold tracking-wider text-ink/50 uppercase">Collections</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(tagLabels).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => update({ tag: tag === key ? null : key })}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                tag === key ? "border-brand-600 bg-brand-600 text-white" : "border-brand-100 bg-white hover:border-brand-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold tracking-wider text-ink/50 uppercase">Max price</h3>
          <span className="text-sm font-bold text-brand-700">{formatINR(maxPrice)}</span>
        </div>
        <input
          type="range"
          min={10}
          max={MAX_PRICE}
          step={10}
          value={maxPrice}
          onChange={(e) => update({ max: Number(e.target.value) >= MAX_PRICE ? null : e.target.value })}
          className="mt-3 w-full accent-brand-600"
          aria-label="Maximum price"
        />
      </div>
      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-brand-100 bg-white p-3">
        <span className="text-sm font-semibold">🌱 Organic only</span>
        <input
          type="checkbox"
          checked={organic}
          onChange={(e) => update({ organic: e.target.checked ? "1" : null })}
          className="h-5 w-5 accent-brand-600"
        />
      </label>
      {hasFilters && (
        <button
          type="button"
          onClick={() => router.replace(pathname, { scroll: false })}
          className="w-full rounded-xl border border-rose-200 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-700">Shop</p>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {q ? <>Results for &ldquo;{q}&rdquo;</> : activeCategory ? activeCategory.name : tag ? tagLabels[tag] ?? "All produce" : "All produce"}
          </h1>
          <p className="mt-1 text-sm text-ink/60">{results.length} items</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-100 bg-white px-4 py-2.5 text-sm font-semibold lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
          <label className="sr-only" htmlFor="sort">
            Sort by
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => update({ sort: e.target.value === "popular" ? null : e.target.value })}
            className="rounded-xl border border-brand-100 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-400"
          >
            {Object.entries(sorts).map(([key, s]) => (
              <option key={key} value={key}>
                Sort: {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {q && (
        <button
          type="button"
          onClick={() => update({ q: null })}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800"
        >
          Search: {q} <X className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">{filters}</aside>

        {results.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-brand-200 bg-white py-20 text-center">
            <span className="text-6xl">🧺</span>
            <p className="mt-4 text-lg font-bold">No produce matches your filters</p>
            <p className="mt-1 text-sm text-ink/60">Try a different search or clear the filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" aria-label="Close filters" className="absolute inset-0 bg-ink/40" onClick={() => setShowFilters(false)} />
          <div className="absolute inset-y-0 right-0 w-80 max-w-[85vw] overflow-y-auto bg-brand-50 p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Filters</h2>
              <button type="button" onClick={() => setShowFilters(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {filters}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
        active ? "bg-brand-600 text-white" : "text-ink/75 hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}
