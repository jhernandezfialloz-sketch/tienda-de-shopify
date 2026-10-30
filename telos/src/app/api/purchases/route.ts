import type { PurchaseStatus } from "@prisma/client";
import { api, body, query } from "@/server/api";
import { assertCan } from "@/server/auth/permissions";
import { createPurchase, listPurchases } from "@/server/services/purchases";

export const GET = api(async ({ req, user }) => {
  assertCan(user, "purchases:read");
  const { q, page, pageSize, sp } = query(req);
  return listPurchases({ q, page, pageSize, status: (sp.get("status") as PurchaseStatus | null) ?? undefined });
});

export const POST = api(async ({ req, user }) => createPurchase(user, await body(req)));
