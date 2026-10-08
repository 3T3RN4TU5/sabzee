import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersView } from "@/components/OrdersView";

export const metadata: Metadata = { title: "My orders" };

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-4xl animate-pulse px-4 py-8" />}>
      <OrdersView />
    </Suspense>
  );
}
