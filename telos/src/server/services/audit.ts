import type { Prisma } from "@prisma/client";
import type { Tx } from "@/lib/db";

export type DomainEventType =
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "STOCK_ADJUSTED"
  | "STOCK_LOW"
  | "OUT_OF_STOCK"
  | "SALE_CREATED"
  | "SALE_CONFIRMED"
  | "SALE_DELIVERED"
  | "SALE_CANCELLED"
  | "SALE_RETURNED"
  | "PAYMENT_RECORDED"
  | "PURCHASE_CREATED"
  | "PURCHASE_STATUS_CHANGED"
  | "PURCHASE_RECEIVED"
  | "CUSTOMER_CREATED";

/** Registro de auditoría (quién cambió qué). Siempre dentro de la transacción del cambio. */
export function audit(
  tx: Tx,
  entry: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
    metadata?: unknown;
  },
) {
  return tx.auditLog.create({
    data: {
      userId: entry.userId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: toJson(entry.before),
      after: toJson(entry.after),
      metadata: toJson(entry.metadata),
    },
  });
}

/** Evento de dominio en el outbox (se despacha a webhooks/automatizaciones en la Fase 4). */
export function emit(tx: Tx, type: DomainEventType, payload: Record<string, unknown>) {
  return tx.domainEvent.create({ data: { type, payload: toJson(payload) ?? {} } });
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  // Serializa Decimal/Date a string de forma estable.
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
