import { assertCan, type Actor } from "@/server/auth/permissions";
import { inventorySummary, listInventory } from "@/server/services/inventory-queries";
import { salesKpis } from "@/server/services/dashboard";
import { daysAgo } from "@/lib/dates";
import { grossMargin } from "@/lib/metrics";

/**
 * Capa de herramientas para agentes de IA (Claude, Codex…). SOLO LECTURA.
 * Cada herramienta recibe un Actor con rol limitado y pasa por los mismos permisos
 * que la UI. Las herramientas de escritura (Fase 4) vivirán en write-tools.ts y
 * reutilizarán los servicios (nunca SQL directo), con confirmación para acciones destructivas.
 */
export const readTools = {
  async getInventory(actor: Actor, args: { q?: string; filter?: "low" | "out" | "all"; page?: number }) {
    assertCan(actor, "inventory:read");
    return listInventory({ ...args, pageSize: 100 });
  },

  async getLowStockProducts(actor: Actor) {
    assertCan(actor, "inventory:read");
    return (await listInventory({ filter: "low", pageSize: 200 })).rows;
  },

  async getInventoryValue(actor: Actor) {
    assertCan(actor, "finance:read");
    return inventorySummary();
  },

  async getSalesMetrics(actor: Actor, args: { days: number }) {
    assertCan(actor, "finance:read");
    const k = await salesKpis(daysAgo(Math.max(args.days - 1, 0)));
    return {
      ...k,
      grossMargin: k.cogs === null ? { ok: false, reason: "No hay suficientes datos" } : grossMargin(k.revenue, k.cogs),
      note: "Montos en centavos de Lempira (HNL).",
    };
  },
} as const;

export type ReadToolName = keyof typeof readTools;
