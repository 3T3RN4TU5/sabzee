import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopView } from "@/components/ShopView";

export const metadata: Metadata = {
  title: "Shop fresh produce",
  description: "Browse 36 farm-fresh vegetables, fruits, greens and herbs. Filter by category, price, organic and more.",
};

export default function ShopPage() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <ShopView />
    </Suspense>
  );
}

function ShopSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-brand-100" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
    </div>
  );
}
