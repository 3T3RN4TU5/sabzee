import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-xl place-items-center px-4 py-24 text-center">
      <span className="text-8xl">🥲</span>
      <h1 className="mt-6 text-3xl font-extrabold">This page went out of stock</h1>
      <p className="mt-2 text-ink/60">We couldn&apos;t find what you were looking for.</p>
      <Link href="/shop" className="mt-8 rounded-xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700">
        Back to the shop
      </Link>
    </div>
  );
}
