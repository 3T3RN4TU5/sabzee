# 🥬 Sabzee — Farm-fresh grocery storefront

A production-style e-commerce web app for ordering vegetables, fruits, leafy greens and herbs — inspired by quick-commerce apps like Blinkit and Zepto.

**Tech:** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS v4 · Zustand · Lucide icons

## Features

- **Product catalogue** of 36 items across 5 categories, with Hindi names, nutrition facts, origin and stock levels
- **Shop page** with URL-driven search, category, collection, price-range and organic filters, plus 5 sort modes (shareable links)
- **Statically generated product pages** (`generateStaticParams`) with SEO metadata, related products and breadcrumbs
- **Persistent cart & wishlist** (Zustand + `localStorage`) with quantity limits and a hydration-safe UI
- **Coupon engine** — percentage / flat discounts, minimum order rules, max-discount caps and free-delivery threshold
- **Checkout** with client-side validation (Indian mobile number, pincode, UPI ID), delivery slots and payment options
- **Order history** with a live status tracker (placed → packed → out for delivery → delivered) and one-click reorder
- **REST API** — `GET /api/products` and `GET /api/products/:slug` (prerendered Route Handlers)
- Responsive, accessible UI with toasts, skeleton loaders, mobile filter drawer and a custom 404

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## Project structure

```
src/
├── app/                 # Routes (App Router)
│   ├── page.tsx         # Landing page
│   ├── shop/            # Search + filters
│   ├── product/[slug]/  # Static product pages
│   ├── cart/ checkout/ orders/ wishlist/
│   └── api/products/    # Route Handlers
├── components/          # UI components (client + server)
└── lib/                 # Data, Zustand store, pricing & coupon logic
```

## Try it

Use coupon codes **FIRSTBUY**, **SABZEE10** or **FRESH50** at the cart. Orders are stored in your browser only — this is a demo store.
