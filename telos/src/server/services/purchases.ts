import type { Prisma, PurchaseStatus } from "@prisma/client";
import { db, transaction } from "@/lib/db";
import { TelosError } from "@/lib/errors";
import { fromCents, toCents } from "@/lib/money";
import { assertCan, type Actor } from "@/server/auth/permissions";
import { parse } from "@/server/validation/common";
import { purchaseInput } from "@/server/validation/schemas";
import { audit, emit } from "./audit";
import { applyStockChange } from "./inventory";
import { assertPurchaseTransition, computeLandedCosts, computePurchaseTotals, weightedAverageCost } from "./purchase-rules";
import { nextPurchaseCode } from "./sequences";

export async function createPurchase(actor: Actor, raw: unknown, opts: { isDemo?: boolean } = {}) {
  assertCan(actor, "purchases:write");
  const input = parse(purchaseInput, raw);
  const ids = input.items.map((i) => i.variantId);
  if (new Set(ids).size !== ids.length) throw new TelosError("VALIDATION", "Una variante aparece dos veces en la compra: usa una sola línea.");

  return transaction(async (tx) => {
    const found = await tx.productVariant.count({ where: { id: { in: ids } } });
    if (found !== ids.length) throw new TelosError("VALIDATION", "Una de las variantes no existe.");
    if (input.supplierId && !(await tx.supplier.findUnique({ where: { id: input.supplierId } }))) {
      throw new TelosError("VALIDATION", "El proveedor no existe.");
    }
    const lines = input.items.map((i) => ({ quantity: i.quantity, unitCost: toCents(i.unitCost) }));
    const shipping = toCents(input.shippingCost ?? "0");
    const taxes = toCents(input.taxes ?? "0");
    const other = toCents(input.otherCosts ?? "0");
    const totals = computePurchaseTotals(lines, shipping, taxes, other);

    const purchase = await tx.purchase.create({
      data: {
        code: await nextPurchaseCode(tx),
        supplierId: input.supplierId ?? null,
        status: input.status,
        orderedAt: input.orderedAt ?? new Date(),
        subtotal: fromCents(totals.subtotal),
        shippingCost: fromCents(shipping),
        taxes: fromCents(taxes),
        otherCosts: fromCents(other),
        total: fromCents(totals.total),
        paymentMethod: input.paymentMethod ?? null,
        notes: input.notes ?? null,
        createdById: actor.id,
        isDemo: opts.isDemo ?? false,
        items: { create: input.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, unitCost: fromCents(toCents(i.unitCost)) })) },
      },
    });
    await audit(tx, { userId: actor.id, action: "purchase.create", entityType: "purchase", entityId: purchase.id, after: input });
    await emit(tx, "PURCHASE_CREATED", { purchaseId: purchase.id, code: purchase.code });
    return purchase;
  });
}

/**
 * Cambia el estado de una compra. Al pasar a RECIBIDA (una sola vez, garantizado
 * por la actualización condicionada) entra el stock con su costo real y se
 * recalcula el costo promedio de cada variante.
 */
export async function transitionPurchase(actor: Actor, purchaseId: string, to: PurchaseStatus) {
  assertCan(actor, to === "RECIBIDA" ? "purchases:receive" : "purchases:write");
  return transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({ where: { id: purchaseId }, include: { items: true } });
    if (!purchase) throw new TelosError("NOT_FOUND", "La compra no existe.");
    assertPurchaseTransition(purchase.status, to);

    const claimed = await tx.purchase.updateMany({
      where: { id: purchaseId, status: purchase.status },
      data: { status: to, ...(to === "RECIBIDA" ? { receivedAt: new Date() } : {}) },
    });
    if (claimed.count !== 1) throw new TelosError("CONFLICT", "La compra cambió mientras la editabas. Recarga e intenta de nuevo.");

    if (to === "RECIBIDA") {
      const extras = toCents(purchase.shippingCost) + toCents(purchase.taxes) + toCents(purchase.otherCosts);
      const landed = computeLandedCosts(purchase.items.map((i) => ({ quantity: i.quantity, unitCost: toCents(i.unitCost) })), extras);
      // Orden estable para evitar interbloqueos.
      const ordered = purchase.items.map((item, i) => ({ item, landedUnitCost: landed[i]?.landedUnitCost ?? 0 })).sort((a, b) => a.item.variantId.localeCompare(b.item.variantId));
      for (const { item, landedUnitCost } of ordered) {
        const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: item.variantId } });
        const movement = await applyStockChange(tx, {
          variantId: item.variantId,
          change: item.quantity,
          type: "COMPRA",
          reason: `Compra ${purchase.code} recibida`,
          referenceType: "purchase",
          referenceId: purchase.id,
          unitCost: landedUnitCost,
          userId: actor.id,
          isDemo: purchase.isDemo,
        });
        const newCost = weightedAverageCost(movement.quantityBefore, variant.cost === null ? null : toCents(variant.cost), item.quantity, landedUnitCost);
        await tx.productVariant.update({ where: { id: item.variantId }, data: { cost: fromCents(newCost) } });
        await tx.purchaseItem.update({ where: { id: item.id }, data: { landedUnitCost: fromCents(landedUnitCost) } });
      }
      await emit(tx, "PURCHASE_RECEIVED", { purchaseId, code: purchase.code });
    } else {
      await emit(tx, "PURCHASE_STATUS_CHANGED", { purchaseId, code: purchase.code, from: purchase.status, to });
    }
    await audit(tx, { userId: actor.id, action: `purchase.${to.toLowerCase()}`, entityType: "purchase", entityId: purchaseId, before: { status: purchase.status }, after: { status: to } });
    return tx.purchase.findUniqueOrThrow({ where: { id: purchaseId } });
  });
}

export async function listPurchases(params: { q?: string; status?: PurchaseStatus; page?: number; pageSize?: number }) {
  const pageSize = Math.min(params.pageSize ?? 25, 100);
  const page = Math.max(params.page ?? 1, 1);
  const where: Prisma.PurchaseWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.q
      ? { OR: [{ code: { contains: params.q, mode: "insensitive" } }, { supplier: { name: { contains: params.q, mode: "insensitive" } } }] }
      : {}),
  };
  const [total, items] = await Promise.all([
    db.purchase.count({ where }),
    db.purchase.findMany({
      where,
      orderBy: { orderedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { supplier: { select: { name: true } }, _count: { select: { items: true } } },
    }),
  ]);
  return { total, page, pageSize, items };
}

export function getPurchase(idOrCode: string) {
  return db.purchase.findFirst({
    where: { OR: [{ id: idOrCode }, { code: idOrCode.toUpperCase() }] },
    include: {
      supplier: true,
      createdBy: { select: { name: true } },
      items: { include: { variant: { include: { product: { select: { name: true, code: true } } } } } },
    },
  });
}
