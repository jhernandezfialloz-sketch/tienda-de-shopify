import type { MovementType } from "@prisma/client";
import { transaction, type Tx } from "@/lib/db";
import { TelosError } from "@/lib/errors";
import { fromCents, type Cents } from "@/lib/money";
import { assertCan, type Actor } from "@/server/auth/permissions";
import { audit, emit } from "./audit";

/**
 * REGLA DE ORO: el stock solo cambia a través de `applyStockChange`, que dentro de
 * una transacción (1) bloquea la fila de inventario, (2) valida que no quede negativo,
 * (3) actualiza el stock y (4) escribe el movimiento inmutable con antes/cambio/después.
 */

export interface StockChange {
  variantId: string;
  change: number;
  type: MovementType;
  reason?: string | null;
  referenceType?: "sale" | "purchase" | "manual";
  referenceId?: string | null;
  unitCost?: Cents | null;
  userId?: string | null;
  isDemo?: boolean;
}

interface LockedRow {
  on_hand: number;
  reserved: number;
}

async function lockInventoryRow(tx: Tx, variantId: string): Promise<LockedRow> {
  await tx.$executeRaw`INSERT INTO inventory (variant_id, on_hand, reserved, updated_at) VALUES (${variantId}, 0, 0, now()) ON CONFLICT (variant_id) DO NOTHING`;
  const rows = await tx.$queryRaw<LockedRow[]>`SELECT on_hand, reserved FROM inventory WHERE variant_id = ${variantId} FOR UPDATE`;
  const row = rows[0];
  if (!row) throw new TelosError("NOT_FOUND", "Variante sin registro de inventario.");
  return row;
}

export async function applyStockChange(tx: Tx, input: StockChange) {
  if (!Number.isInteger(input.change) || input.change === 0) {
    throw new TelosError("VALIDATION", "La cantidad del movimiento debe ser un entero distinto de cero.");
  }
  const variant = await tx.productVariant.findUnique({
    where: { id: input.variantId },
    select: { id: true, sku: true, minimumStock: true, product: { select: { name: true, minimumStock: true } } },
  });
  if (!variant) throw new TelosError("NOT_FOUND", "La variante no existe.");

  const row = await lockInventoryRow(tx, input.variantId);
  const before = row.on_hand;
  const after = before + input.change;
  if (after < 0) {
    throw new TelosError(
      "INSUFFICIENT_STOCK",
      `Stock insuficiente para ${variant.sku}: hay ${before}, se intentó descontar ${-input.change}.`,
      { sku: variant.sku, available: before, requested: -input.change },
    );
  }
  if (after < row.reserved) {
    throw new TelosError("INSUFFICIENT_STOCK", `${variant.sku}: no se puede bajar el stock por debajo de lo reservado (${row.reserved}).`);
  }

  await tx.$executeRaw`UPDATE inventory SET on_hand = ${after}, updated_at = now() WHERE variant_id = ${input.variantId}`;
  const movement = await tx.inventoryMovement.create({
    data: {
      variantId: input.variantId,
      type: input.type,
      quantityBefore: before,
      quantityChange: input.change,
      quantityAfter: after,
      unitCost: input.unitCost == null ? null : fromCents(input.unitCost),
      reason: input.reason ?? null,
      referenceType: input.referenceType ?? "manual",
      referenceId: input.referenceId ?? null,
      userId: input.userId ?? null,
      isDemo: input.isDemo ?? false,
    },
  });

  const minimum = variant.minimumStock ?? variant.product.minimumStock;
  if (after === 0 && before > 0) {
    await notifyStock(tx, "OUT_OF_STOCK", `Agotado: ${variant.sku}`, `${variant.product.name} se quedó sin unidades.`, input.variantId, input.isDemo);
  } else if (minimum > 0 && after <= minimum && before > minimum) {
    await notifyStock(tx, "STOCK_LOW", `Stock bajo: ${variant.sku}`, `${variant.product.name}: quedan ${after} (mínimo ${minimum}).`, input.variantId, input.isDemo);
  }
  return movement;
}

async function notifyStock(tx: Tx, type: "STOCK_LOW" | "OUT_OF_STOCK", title: string, body: string, variantId: string, isDemo?: boolean) {
  await tx.notification.create({ data: { type, title, body, entityType: "variant", entityId: variantId, isDemo: isDemo ?? false } });
  await emit(tx, type, { variantId });
}

/** Aplica varios cambios bloqueando filas en orden estable (evita interbloqueos). */
export async function applyStockChanges(tx: Tx, changes: StockChange[]) {
  const sorted = [...changes].sort((a, b) => a.variantId.localeCompare(b.variantId));
  const movements = [];
  for (const change of sorted) movements.push(await applyStockChange(tx, change));
  return movements;
}

// ───────── Ajustes manuales desde Telos Admin ─────────

export const MANUAL_MOVEMENT_TYPES = ["INICIAL", "AJUSTE", "CORRECCION", "DANO", "PERDIDA", "DEVOLUCION"] as const;
export type ManualMovementType = (typeof MANUAL_MOVEMENT_TYPES)[number];

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  INICIAL: "Inventario inicial",
  COMPRA: "Compra",
  VENTA: "Venta",
  DEVOLUCION: "Devolución",
  CORRECCION: "Corrección (conteo)",
  DANO: "Daño",
  PERDIDA: "Pérdida",
  AJUSTE: "Ajuste",
  CANCELACION: "Cancelación",
};

export interface ManualAdjustment {
  variantId: string;
  type: ManualMovementType;
  /** Para CORRECCION: cantidad contada físicamente. Para el resto: unidades (positivo). */
  quantity: number;
  /** Solo AJUSTE: dirección del cambio. */
  direction?: "in" | "out";
  reason: string;
}

/** Traduce un ajuste manual en el cambio con signo correcto. Pura, testeable. */
export function resolveAdjustment(adj: ManualAdjustment, currentOnHand: number): number {
  if (!Number.isInteger(adj.quantity) || adj.quantity < 0) throw new TelosError("VALIDATION", "La cantidad debe ser un entero positivo.");
  switch (adj.type) {
    case "CORRECCION":
      return adj.quantity - currentOnHand;
    case "DANO":
    case "PERDIDA":
      return -adj.quantity;
    case "INICIAL":
    case "DEVOLUCION":
      return adj.quantity;
    case "AJUSTE":
      return adj.direction === "out" ? -adj.quantity : adj.quantity;
  }
}

export async function adjustStock(actor: Actor, adj: ManualAdjustment) {
  assertCan(actor, "inventory:adjust");
  if (!adj.reason?.trim()) throw new TelosError("VALIDATION", "Indica la razón del ajuste (queda en el historial).");
  return transaction(async (tx) => {
    const row = await lockInventoryRow(tx, adj.variantId);
    const change = resolveAdjustment(adj, row.on_hand);
    if (change === 0) throw new TelosError("VALIDATION", "El conteo coincide con el stock actual: no hay nada que ajustar.");
    const movement = await applyStockChange(tx, {
      variantId: adj.variantId,
      change,
      type: adj.type,
      reason: adj.reason.trim(),
      referenceType: "manual",
      userId: actor.id,
    });
    await audit(tx, {
      userId: actor.id,
      action: "inventory.adjust",
      entityType: "variant",
      entityId: adj.variantId,
      before: { onHand: movement.quantityBefore },
      after: { onHand: movement.quantityAfter },
      metadata: { type: adj.type, reason: adj.reason },
    });
    await emit(tx, "STOCK_ADJUSTED", { variantId: adj.variantId, movementId: movement.id, change });
    return movement;
  });
}
