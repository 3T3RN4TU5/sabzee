import { getProduct, getRelated, products } from "@/lib/products";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

/** GET /api/products/:slug — single product with related items */
export async function GET(_request: Request, { params }: RouteContext<"/api/products/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) {
    return Response.json({ error: `Product "${slug}" not found` }, { status: 404 });
  }
  return Response.json({ product, related: getRelated(product) });
}
