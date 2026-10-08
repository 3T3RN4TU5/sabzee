import Link from "next/link";
import { ArrowRight, Clock, Leaf, ShieldCheck, Truck } from "lucide-react";
import { categories, products } from "@/lib/products";
import { coupons } from "@/lib/pricing";
import { ProductCard } from "@/components/ProductCard";

const perks = [
  { icon: Clock, title: "30-min delivery", text: "Hyperlocal dark stores near you" },
  { icon: Leaf, title: "Farm to door", text: "Sourced daily from 1,200+ farmers" },
  { icon: ShieldCheck, title: "Quality checked", text: "Every item hand-picked & graded" },
  { icon: Truck, title: "Free delivery", text: "On all orders above ₹499" },
];

const testimonials = [
  { name: "Priya S.", city: "Pune", text: "The palak and dhaniya are fresher than my local mandi. Delivery is genuinely under 30 minutes!", rating: 5 },
  { name: "Arjun M.", city: "Bengaluru", text: "Love the clean UI and how easy it is to reorder my weekly sabzi. The Alphonso mangoes were incredible.", rating: 5 },
  { name: "Neha R.", city: "Delhi", text: "Organic filter is a lifesaver. Prices are fair and coupons actually work.", rating: 4 },
];

export default function Home() {
  const bestsellers = products.filter((p) => p.tags.includes("bestseller")).slice(0, 10);
  const deals = products.filter((p) => p.tags.includes("deal")).slice(0, 5);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-br from-brand-700 via-brand-600 to-brand-500">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div className="text-white">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-saffron-400" /> Delivering now in 12 cities
            </span>
            <h1 className="mt-5 text-4xl leading-[1.1] font-extrabold tracking-tight md:text-6xl">
              Farm-fresh sabzi,
              <br />
              <span className="text-saffron-400">delivered in 30 min.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-brand-50/90">
              Handpicked vegetables, juicy fruits, leafy greens and herbs — straight from Indian farms to your kitchen. No middlemen, no compromise.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-brand-700 shadow-lg transition hover:bg-brand-50">
                Start shopping <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/shop?tag=deal" className="inline-flex items-center gap-2 rounded-xl border-2 border-white/40 px-6 py-3.5 font-bold text-white transition hover:bg-white/10">
                Today&apos;s deals
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[
                ["50k+", "Happy homes"],
                ["4.8★", "App rating"],
                ["36", "Fresh picks"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="text-2xl font-extrabold">{v}</dt>
                  <dd className="text-xs text-brand-100/80">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative hidden h-[420px] md:block" aria-hidden>
            <div className="absolute inset-8 rounded-[3rem] bg-white/10 backdrop-blur-sm" />
            {[
              ["🥕", "top-6 left-16 text-8xl", "0s"],
              ["🍅", "top-20 right-12 text-7xl", "1s"],
              ["🥬", "bottom-24 left-6 text-8xl", "2s"],
              ["🥭", "bottom-10 right-20 text-8xl", "0.5s"],
              ["🫑", "top-44 left-1/2 -translate-x-1/2 text-9xl", "1.5s"],
              ["🍋", "bottom-44 right-2 text-6xl", "2.5s"],
            ].map(([emoji, pos, delay]) => (
              <span key={emoji} className={`animate-float absolute drop-shadow-xl ${pos}`} style={{ animationDelay: delay }}>
                {emoji}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="relative z-10 mx-auto -mt-8 max-w-7xl px-4">
        <div className="grid gap-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-xl shadow-brand-900/5 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-center gap-3 rounded-xl p-2">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold">{title}</p>
                <p className="text-xs text-ink/60">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto mt-14 max-w-7xl px-4">
        <SectionTitle title="Shop by category" href="/shop" />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/shop?category=${c.id}`}
              className="group rounded-2xl p-5 transition hover:-translate-y-1 hover:shadow-lg"
              style={{ backgroundColor: c.color }}
            >
              <span className="block text-5xl transition group-hover:scale-110">{c.emoji}</span>
              <p className="mt-4 font-bold">{c.name}</p>
              <p className="text-xs text-ink/60">{c.tagline}</p>
              <p className="mt-2 text-xs font-semibold text-brand-700">
                {products.filter((p) => p.category === c.id).length} items →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Bestsellers */}
      <section className="mx-auto mt-14 max-w-7xl px-4">
        <SectionTitle title="Bestsellers this week" href="/shop?tag=bestseller" />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {bestsellers.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Coupons */}
      <section className="mx-auto mt-14 max-w-7xl px-4">
        <div className="grid gap-4 md:grid-cols-3">
          {coupons.map((c, i) => (
            <div
              key={c.code}
              className={`relative overflow-hidden rounded-2xl p-6 text-white ${
                ["bg-linear-to-br from-saffron-500 to-orange-600", "bg-linear-to-br from-brand-600 to-emerald-800", "bg-linear-to-br from-fuchsia-600 to-purple-800"][i]
              }`}
            >
              <p className="text-xs font-bold tracking-widest uppercase opacity-80">Use code</p>
              <p className="mt-1 text-3xl font-extrabold tracking-wide">{c.code}</p>
              <p className="mt-2 text-sm opacity-90">{c.description}</p>
              <span className="absolute -right-4 -bottom-6 text-8xl opacity-20">🏷️</span>
            </div>
          ))}
        </div>
      </section>

      {/* Deals */}
      <section className="mx-auto mt-14 max-w-7xl px-4">
        <SectionTitle title="Deals of the day 🔥" href="/shop?tag=deal" />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {deals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto mt-16 max-w-7xl px-4">
        <h2 className="text-center text-2xl font-extrabold md:text-3xl">Loved by home chefs across India</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.name} className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
              <p className="text-saffron-500">{"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}</p>
              <blockquote className="mt-3 text-sm leading-relaxed text-ink/80">&ldquo;{t.text}&rdquo;</blockquote>
              <figcaption className="mt-4 text-sm font-bold">
                {t.name} <span className="font-medium text-ink/50">· {t.city}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h2>
      <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-brand-700 hover:underline">
        View all <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
