import type { SaleStatus } from "@prisma/client";
import { api, body, query } from "@/server/api";
import { assertCan } from "@/server/auth/permissions";
import { createSale, listSales } from "@/server/services/sales";

export const GET = api(async ({ req, user }) => {
  assertCan(user, "sales:read");
  const { q, page, pageSize, sp } = query(req);
  return listSales({ q, page, pageSize, status: (sp.get("status") as SaleStatus | null) ?? undefined, channel: sp.get("channel") ?? undefined });
});

/** Envía `idempotencyKey` para que un reintento no duplique la venta. */
export const POST = api(async ({ req, user }) => createSale(user, await body(req)));
