import type { Prisma, SaleStatus } from "@prisma/client";
import { db, transaction, type Tx } from "@/lib/db";
import { TelosError } from "@/lib/errors";
import { fromCents, toCents } from "@/lib/money";
import { assertCan, type Actor } from "@/server/auth/permissions";
import { parse } from "@/server/validation/common";
import { paymentInput, saleInput } from "@/server/validation/schemas";
import { audit, emit } from "./audit";
import { applyStockChanges } from "./inventory";
import { assertSaleTransition, computeProfit, computeSaleTotals, paymentStatusFor } from "./sale-rules";
import { nextSaleCode } from "./sequences";

export async function createSale(actor: Actor, raw: unknown, opts: { isDemo?: boolean } = {}) {
  assertCan(actor, "sales:write");
  const input = parse(saleInput, raw);

  if (input.idempotencyKey) {
    const existing = await db.sale.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) return existing; // Reintento o doble clic: no se duplica la venta.
  }
  const variantIds = input.items.map((i) => i.variantId);
  if (new Set(variantIds).size !== variantIds.length) {
    throw new TelosError("VALIDATION", "Un mismo producto/variante aparece dos veces: suma las cantidades en una sola línea.");
  }

  return transaction(async (tx) => {
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { select: { name: true, status: true } } },
    });
    const byId = new Map(variants.map((v) => [v.id, v]));
    const lines = input.items.map((item) => {
      const variant = byId.get(item.variantId);
      if (!variant || !variant.active || variant.product.status === "ARCHIVED") {
        throw new TelosError("VALIDATION", "Una de las variantes no existe o está desactivada.");
      }
      const unitPrice = item.unitPrice !== undefined ? toCents(item.unitPrice) : variant.price !== null ? toCents(variant.price) : null;
      if (unitPrice === null) {
        throw new TelosError("VALIDATION", `${variant.sku} no tiene precio registrado. Indica el precio en la línea o regístralo en el producto.`);
      }
      return { variantId: variant.id, quantity: item.quantity, unitPrice, discount: toCents(item.discount ?? "0") };
    });
    const totals = computeSaleTotals(lines, toCents(input.discount ?? "0"));

    let customerId = input.customerId ?? null;
    if (!customerId && input.newCustomer) {
      const customer = await tx.customer.create({
        data: { ...input.newCustomer, acquisitionSource: input.channel, isDemo: opts.isDemo ?? false },
      });
      customerId = customer.id;
      await emit(tx, "CUSTOMER_CREATED", { customerId });
    }

    const sale = await tx.sale.create({
      data: {
        code: await nextSaleCode(tx),
        idempotencyKey: input.idempotencyKey ?? null,
        customerId,
        sellerId: input.sellerId ?? actor.id,
        createdById: actor.id,
        channel: input.channel,
        paymentMethod: input.paymentMethod ?? null,
        soldAt: input.soldAt ?? new Date(),
        subtotal: fromCents(totals.subtotal),
        discount: fromCents(totals.discount),
        total: fromCents(totals.total),
        notes: input.notes ?? null,
        isDemo: opts.isDemo ?? false,
        items: {
          create: lines.map((l, i) => ({
            variantId: l.variantId,
            quantity: l.quantity,
            unitPrice: fromCents(l.unitPrice),
            discount: fromCents(l.discount),
            lineTotal: fromCents(totals.lineTotals[i] ?? 0),
          })),
        },
      },
    });
    await audit(tx, { userId: actor.id, action: "sale.create", entityType: "sale", entityId: sale.id, after: { code: sale.code, total: sale.total } });
    await emit(tx, "SALE_CREATED", { saleId: sale.id, code: sale.code });

    if (input.confirm) await confirmSaleTx(tx, actor, sale.id);
    if (input.markPaid) {
      await recordPaymentTx(tx, actor, sale.id, { amount: fromCents(totals.total), method: input.paymentMethod ?? "Efectivo" });
    }
    return tx.sale.findUniqueOrThrow({ where: { id: sale.id } });
  });
}

/** Confirmar: descuenta inventario (una sola vez), fija costo histórico y utilidad. */
async function confirmSaleTx(tx: Tx, actor: Actor, saleId: string) {
  // Actualización condicionada: si dos usuarios confirman a la vez, solo uno gana.
  const claimed = await tx.sale.updateMany({
    where: { id: saleId, status: "PENDIENTE", stockCommittedAt: null },
    data: { status: "CONFIRMADA", confirmedAt: new Date(), stockCommittedAt: new Date() },
  });
  if (claimed.count !== 1) throw new TelosError("INVALID_TRANSITION", "La venta ya fue confirmada o no está pendiente.");

  const sale = await tx.sale.findUniqueOrThrow({ where: { id: saleId }, include: { items: { include: { variant: true } } } });
  const costs = new Map(sale.items.map((i) => [i.id, i.variant.cost === null ? null : toCents(i.variant.cost)]));

  await applyStockChanges(
    tx,
    sale.items.map((item) => ({
      variantId: item.variantId,
      change: -item.quantity,
      type: "VENTA" as const,
      reason: `Venta ${sale.code}`,
      referenceType: "sale" as const,
      referenceId: sale.id,
      unitCost: costs.get(item.id) ?? null,
      userId: actor.id,
      isDemo: sale.isDemo,
    })),
  );
  for (const item of sale.items) {
    const cost = costs.get(item.id);
    if (cost !== null && cost !== undefined) await tx.saleItem.update({ where: { id: item.id }, data: { unitCost: fromCents(cost) } });
  }
  const profit = computeProfit(
    toCents(sale.total),
    sale.items.map((i) => ({ quantity: i.quantity, unitCost: costs.get(i.id) ?? null })),
  );
  await tx.sale.update({
    where: { id: saleId },
    data: {
      costTotal: profit.costTotal === null ? null : fromCents(profit.costTotal),
      grossProfit: profit.grossProfit === null ? null : fromCents(profit.grossProfit),
    },
  });
  if (profit.costTotal === null) {
    await tx.notification.create({
      data: {
        type: "MISSING_COST",
        title: `Venta ${sale.code} sin costo completo`,
        body: "Algún producto no tiene costo registrado; la utilidad de esta venta no se puede calcular.",
        entityType: "sale",
        entityId: sale.id,
        isDemo: sale.isDemo,
      },
    });
  }
  await audit(tx, { userId: actor.id, action: "sale.confirm", entityType: "sale", entityId: saleId, before: { status: "PENDIENTE" }, after: { status: "CONFIRMADA" } });
  await emit(tx, "SALE_CONFIRMED", { saleId, code: sale.code, total: sale.total });
}

/** Repone el stock de una venta ya descontada (cancelación o devolución). */
async function restockSaleTx(tx: Tx, actor: Actor, saleId: string, type: "CANCELACION" | "DEVOLUCION") {
  const sale = await tx.sale.findUniqueOrThrow({ where: { id: saleId }, include: { items: true } });
  if (!sale.stockCommittedAt) return; // nunca se descontó: nada que reponer
  await applyStockChanges(
    tx,
    sale.items.map((item) => ({
      variantId: item.variantId,
      change: item.quantity,
      type,
      reason: `${type === "CANCELACION" ? "Cancelación" : "Devolución"} de ${sale.code}`,
      referenceType: "sale" as const,
      referenceId: sale.id,
      unitCost: item.unitCost === null ? null : toCents(item.unitCost),
      userId: actor.id,
      isDemo: sale.isDemo,
    })),
  );
  await tx.sale.update({ where: { id: saleId }, data: { stockCommittedAt: null } });
}

export async function transitionSale(actor: Actor, saleId: string, to: SaleStatus, reason?: string) {
  assertCan(actor, to === "CANCELADA" || to === "DEVUELTA" ? "sales:cancel" : "sales:write");
  return transaction(async (tx) => {
    const sale = await tx.sale.findUnique({ where: { id: saleId } });
    if (!sale) throw new TelosError("NOT_FOUND", "La venta no existe.");
    assertSaleTransition(sale.status, to);

    if (to === "CONFIRMADA") {
      await confirmSaleTx(tx, actor, saleId);
    } else {
      const claimed = await tx.sale.updateMany({
        where: { id: saleId, status: sale.status },
        data: {
          status: to,
          ...(to === "ENTREGADA" ? { deliveredAt: new Date() } : {}),
          ...(to === "CANCELADA" || to === "DEVUELTA" ? { cancelledAt: new Date() } : {}),
          ...(reason ? { notes: [sale.notes, `[${to}] ${reason}`].filter(Boolean).join("\n") } : {}),
        },
      });
      if (claimed.count !== 1) throw new TelosError("CONFLICT", "La venta cambió mientras la editabas. Recarga e intenta de nuevo.");
      if (to === "CANCELADA") await restockSaleTx(tx, actor, saleId, "CANCELACION");
      if (to === "DEVUELTA") await restockSaleTx(tx, actor, saleId, "DEVOLUCION");
      await audit(tx, { userId: actor.id, action: `sale.${to.toLowerCase()}`, entityType: "sale", entityId: saleId, before: { status: sale.status }, after: { status: to }, metadata: { reason } });
      const eventType = to === "ENTREGADA" ? "SALE_DELIVERED" : to === "CANCELADA" ? "SALE_CANCELLED" : "SALE_RETURNED";
      await emit(tx, eventType, { saleId, code: sale.code });
    }
    return tx.sale.findUniqueOrThrow({ where: { id: saleId } });
  });
}

async function recordPaymentTx(tx: Tx, actor: Actor, saleId: string, raw: unknown) {
  const input = parse(paymentInput, raw);
  const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { payments: true } });
  if (!sale) throw new TelosError("NOT_FOUND", "La venta no existe.");
  if (sale.status === "CANCELADA" || sale.status === "DEVUELTA") throw new TelosError("INVALID_TRANSITION", "No se pueden registrar pagos en una venta cancelada o devuelta.");
  const amount = toCents(input.amount);
  if (amount <= 0) throw new TelosError("VALIDATION", "El monto debe ser mayor que 0.");
  const paid = sale.payments.reduce((s, p) => s + toCents(p.amount), 0);
  const total = toCents(sale.total);
  if (paid + amount > total) throw new TelosError("VALIDATION", `El pago excede el saldo pendiente (${fromCents(total - paid)}).`);
  await tx.payment.create({ data: { saleId, amount: fromCents(amount), method: input.method, reference: input.reference, userId: actor.id, isDemo: sale.isDemo } });
  await tx.sale.update({ where: { id: saleId }, data: { paymentStatus: paymentStatusFor(paid + amount, total), paymentMethod: sale.paymentMethod ?? input.method } });
  await audit(tx, { userId: actor.id, action: "sale.payment", entityType: "sale", entityId: saleId, after: input });
  await emit(tx, "PAYMENT_RECORDED", { saleId, amount: input.amount });
}

export async function recordPayment(actor: Actor, saleId: string, raw: unknown) {
  assertCan(actor, "sales:write");
  return transaction((tx) => recordPaymentTx(tx, actor, saleId, raw));
}

// ───────── Consultas ─────────

export async function listSales(params: { q?: string; status?: SaleStatus; channel?: string; page?: number; pageSize?: number }) {
  const pageSize = Math.min(params.pageSize ?? 25, 100);
  const page = Math.max(params.page ?? 1, 1);
  const where: Prisma.SaleWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.channel ? { channel: params.channel as Prisma.SaleWhereInput["channel"] } : {}),
    ...(params.q
      ? {
          OR: [
            { code: { contains: params.q, mode: "insensitive" } },
            { customer: { name: { contains: params.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [total, items] = await Promise.all([
    db.sale.count({ where }),
    db.sale.findMany({
      where,
      orderBy: { soldAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { customer: { select: { name: true } }, _count: { select: { items: true } } },
    }),
  ]);
  return { total, page, pageSize, items };
}

export function getSale(idOrCode: string) {
  return db.sale.findFirst({
    where: { OR: [{ id: idOrCode }, { code: idOrCode.toUpperCase() }] },
    include: {
      customer: true,
      seller: { select: { name: true } },
      items: { include: { variant: { include: { product: { select: { name: true, code: true } } } } } },
      payments: { orderBy: { paidAt: "asc" } },
    },
  });
}
