import type { Cents } from "./money";

/** Resultado de una métrica: un número o "sin datos suficientes" (nunca inventar). */
export type Metric = { ok: true; value: number } | { ok: false; reason: "No hay suficientes datos" };

const noData: Metric = { ok: false, reason: "No hay suficientes datos" };

export function grossProfit(revenue: Cents, cogs: Cents): Cents {
  return revenue - cogs;
}

/** Margen bruto en % (con 1 decimal). */
export function grossMargin(revenue: Cents, cogs: Cents): Metric {
  if (revenue <= 0) return noData;
  return { ok: true, value: Math.round(((revenue - cogs) / revenue) * 1000) / 10 };
}

export function averageOrderValue(revenue: Cents, orders: number): Metric {
  if (orders <= 0) return noData;
  return { ok: true, value: Math.round(revenue / orders) };
}

export function unitsPerTransaction(units: number, transactions: number): Metric {
  if (transactions <= 0) return noData;
  return { ok: true, value: Math.round((units / transactions) * 100) / 100 };
}

export function sellThroughRate(unitsSold: number, unitsAvailableInitially: number): Metric {
  if (unitsAvailableInitially <= 0) return noData;
  return { ok: true, value: Math.round((unitsSold / unitsAvailableInitially) * 1000) / 10 };
}

export function inventoryTurnover(cogs: Cents, averageInventoryCost: Cents): Metric {
  if (averageInventoryCost <= 0 || cogs <= 0) return noData;
  return { ok: true, value: Math.round((cogs / averageInventoryCost) * 100) / 100 };
}

/** Margen unitario de una variante: precio - costo, y % sobre precio. */
export function unitMargin(price: Cents | null, cost: Cents | null): { amount: Cents; percent: number } | null {
  if (price === null || cost === null || price <= 0) return null;
  return { amount: price - cost, percent: Math.round(((price - cost) / price) * 1000) / 10 };
}
