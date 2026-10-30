import type { PurchaseStatus } from "@prisma/client";
import { TelosError } from "@/lib/errors";
import { allocate, type Cents } from "@/lib/money";

/**
 *   BORRADOR → ORDENADA | ENVIADA | RECIBIDA | CANCELADA
 *   ORDENADA → ENVIADA | RECIBIDA | CANCELADA
 *   ENVIADA  → RECIBIDA | CANCELADA
 * RECIBIDA es final: corregir una recepción se hace con un ajuste de inventario.
 */
export const PURCHASE_TRANSITIONS: Record<PurchaseStatus, readonly PurchaseStatus[]> = {
  BORRADOR: ["ORDENADA", "ENVIADA", "RECIBIDA", "CANCELADA"],
  ORDENADA: ["ENVIADA", "RECIBIDA", "CANCELADA"],
  ENVIADA: ["RECIBIDA", "CANCELADA"],
  RECIBIDA: [],
  CANCELADA: [],
};

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  BORRADOR: "Borrador",
  ORDENADA: "Ordenada",
  ENVIADA: "Enviada",
  RECIBIDA: "Recibida",
  CANCELADA: "Cancelada",
};

export function assertPurchaseTransition(from: PurchaseStatus, to: PurchaseStatus) {
  if (!PURCHASE_TRANSITIONS[from].includes(to)) {
    throw new TelosError("INVALID_TRANSITION", `Una compra ${PURCHASE_STATUS_LABELS[from].toLowerCase()} no puede pasar a ${PURCHASE_STATUS_LABELS[to].toLowerCase()}.`);
  }
}

export interface PurchaseLine {
  quantity: number;
  unitCost: Cents;
}

/**
 * Costo real unitario. Los costos adicionales (transporte + impuestos + otros) se
 * prorratean según el valor de mercancía de cada línea, sin perder centavos.
 * Con un solo producto equivale a: (mercancía + extras) / unidades.
 */
export function computeLandedCosts(lines: PurchaseLine[], extras: Cents) {
  const merch = lines.map((l) => l.unitCost * l.quantity);
  const shares = allocate(extras, merch.some((m) => m > 0) ? merch : lines.map((l) => l.quantity));
  return lines.map((l, i) => {
    const lineTotal = (merch[i] ?? 0) + (shares[i] ?? 0);
    return { lineTotal, landedUnitCost: Math.round(lineTotal / l.quantity) };
  });
}

export function computePurchaseTotals(lines: PurchaseLine[], shipping: Cents, taxes: Cents, other: Cents) {
  const subtotal = lines.reduce((s, l) => s + l.unitCost * l.quantity, 0);
  return { subtotal, total: subtotal + shipping + taxes + other };
}

/** Costo promedio ponderado tras una entrada de inventario. */
export function weightedAverageCost(onHandBefore: number, costBefore: Cents | null, qtyIn: number, unitCostIn: Cents): Cents {
  if (onHandBefore <= 0 || costBefore === null) return unitCostIn;
  return Math.round((onHandBefore * costBefore + qtyIn * unitCostIn) / (onHandBefore + qtyIn));
}
