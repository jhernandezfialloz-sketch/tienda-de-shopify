import { api, body, query } from "@/server/api";
import { assertCan } from "@/server/auth/permissions";
import { createProduct, listProducts } from "@/server/services/products";

export const GET = api(async ({ req, user }) => {
  assertCan(user, "products:read");
  const { q, page, pageSize, sp } = query(req);
  return listProducts({ q, page, pageSize, categoryId: sp.get("categoryId") ?? undefined, status: sp.get("status") ?? undefined });
});

export const POST = api(async ({ req, user }) => createProduct(user, await body(req)));
