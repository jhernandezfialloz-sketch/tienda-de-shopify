import type { SaleStatus } from "@prisma/client";
import { TelosError } from "@/lib/errors";
import type { Cents } from "@/lib/money";

/**
 * Máquina de estados de ventas (estado de la orden; el pago se lleva aparte en payment_status).
 *   PENDIENTE → CONFIRMADA (descuenta stock) | CANCELADA
 *   CONFIRMADA → ENTREGADA | CANCELADA (repone stock)
 *   ENTREGADA → DEVUELTA (repone stock)
 */
export const SALE_TRANSITIONS: Record<SaleStatus, readonly SaleStatus[]> = {
  PENDIENTE: ["CONFIRMADA", "CANCELADA"],
  CONFIRMADA: ["ENTREGADA", "CANCELADA"],
  ENTREGADA: ["DEVUELTA"],
  CANCELADA: [],
  DEVUELTA: [],
};

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADA: "Confirmada",
  ENTREGADA: "Entregada",
  CANCELADA: "Cancelada",
  DEVUELTA: "Devuelta",
};

/** Estados que cuentan como ingreso en métricas. */
export const REVENUE_STATUSES: SaleStatus[] = ["CONFIRMADA", "ENTREGADA"];

export function assertSaleTransition(from: SaleStatus, to: SaleStatus) {
  if (!SALE_TRANSITIONS[from].includes(to)) {
    throw new TelosError("INVALID_TRANSITION", `Una venta ${SALE_STATUS_LABELS[from].toLowerCase()} no puede pasar a ${SALE_STATUS_LABELS[to].toLowerCase()}.`);
  }
}

export interface LineInput {
  quantity: number;
  unitPrice: Cents;
  discount: Cents;
}

/** Calcula totales de una venta. Pura y testeable. */
export function computeSaleTotals(lines: LineInput[], globalDiscount: Cents) {
  const lineTotals = lines.map((l) => {
    const gross = l.unitPrice * l.quantity;
    if (l.discount < 0 || l.discount > gross) throw new TelosError("VALIDATION", "El descuento de una línea no puede superar su importe.");
    return gross - l.discount;
  });
  const subtotal = lineTotals.reduce((a, b) => a + b, 0);
  if (globalDiscount < 0 || globalDiscount > subtotal) throw new TelosError("VALIDATION", "El descuento no puede superar el subtotal.");
  return { lineTotals, subtotal, discount: globalDiscount, total: subtotal - globalDiscount };
}

/** COGS y utilidad. Si falta el costo de alguna línea, no se inventa: devuelve null. */
export function computeProfit(total: Cents, lines: { quantity: number; unitCost: Cents | null }[]) {
  if (lines.some((l) => l.unitCost === null)) return { costTotal: null, grossProfit: null };
  const costTotal = lines.reduce((sum, l) => sum + (l.unitCost ?? 0) * l.quantity, 0);
  return { costTotal, grossProfit: total - costTotal };
}

export function paymentStatusFor(paid: Cents, total: Cents) {
  if (paid <= 0) return "PENDIENTE" as const;
  if (paid < total) return "PARCIAL" as const;
  return "PAGADA" as const;
}
