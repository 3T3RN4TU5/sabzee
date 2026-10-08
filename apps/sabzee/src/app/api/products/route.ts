import { categories, products } from "@/lib/products";

/** Public, prerendered catalogue endpoint: GET /api/products */
export async function GET() {
  return Response.json({
    count: products.length,
    categories,
    products,
  });
}
