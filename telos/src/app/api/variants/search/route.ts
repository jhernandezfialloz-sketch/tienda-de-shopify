import { api, query } from "@/server/api";
import { assertCan } from "@/server/auth/permissions";
import { searchVariants } from "@/server/services/products";

export const GET = api(async ({ req, user }) => {
  assertCan(user, "products:read");
  const variants = await searchVariants(query(req).q ?? "");
  return variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    name: v.product.name,
    color: v.color,
    size: v.size,
    price: v.price?.toFixed(2) ?? null,
    cost: v.cost?.toFixed(2) ?? null,
    onHand: v.inventory?.onHand ?? 0,
  }));
});
