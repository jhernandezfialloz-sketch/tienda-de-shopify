import { api, query } from "@/server/api";
import { assertCan } from "@/server/auth/permissions";
import { inventorySummary, listInventory } from "@/server/services/inventory-queries";

export const GET = api(async ({ req, user }) => {
  assertCan(user, "inventory:read");
  const { q, page, pageSize, sp } = query(req);
  const filter = (sp.get("filter") as "low" | "out" | "all" | null) ?? "all";
  const [summary, list] = await Promise.all([inventorySummary(), listInventory({ q, filter, page, pageSize })]);
  return { summary, ...list };
});
