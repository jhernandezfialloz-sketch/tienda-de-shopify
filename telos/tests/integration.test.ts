import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { adjustStock } from "@/server/services/inventory";
import { createSale, recordPayment, transitionSale } from "@/server/services/sales";
import { createPurchase, transitionPurchase } from "@/server/services/purchases";
import { createProduct } from "@/server/services/products";
import { makeActor, makeProduct, onHand, resetDb } from "./helpers";

beforeEach(resetDb);

describe("productos y SKU", () => {
  it("genera códigos secuenciales y SKU de variantes, con movimiento INICIAL", async () => {
    const owner = await makeActor();
    const a = await makeProduct(owner, { sizes: ["M", "L"], stock: 3 });
    const b = await makeProduct(owner);
    expect(a.product.code).toBe("TLS-CMT-001");
    expect(b.product.code).toBe("TLS-CMT-002");
    expect(a.variants.map((v) => v.sku)).toEqual(["TLS-CMT-001-BLK-L", "TLS-CMT-001-BLK-M"]);
    const movements = await db.inventoryMovement.findMany({ where: { variantId: a.variant.id } });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ type: "INICIAL", quantityBefore: 0, quantityChange: 3, quantityAfter: 3 });
  });

  it("rechaza SKU duplicados", async () => {
    const owner = await makeActor();
    const { product } = await makeProduct(owner);
    await expect(
      createProduct(owner, { name: "Otra", categoryId: product.categoryId, variants: [{ sku: "TLS-CMT-001-BLK-M" }] }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});

describe("ventas", () => {
  it("confirmar descuenta stock, registra movimiento, costo y utilidad", async () => {
    const owner = await makeActor();
    const { variant } = await makeProduct(owner, { stock: 10, price: "600", cost: "350" });
    const sale = await createSale(owner, { channel: "INSTAGRAM", confirm: true, items: [{ variantId: variant.id, quantity: 3 }] });
    expect(sale.status).toBe("CONFIRMADA");
    expect(sale.code).toBe("TEL-V-00001");
    expect(sale.total.toFixed(2)).toBe("1800.00");
    expect(sale.costTotal?.toFixed(2)).toBe("1050.00");
    expect(sale.grossProfit?.toFixed(2)).toBe("750.00");
    expect(await onHand(variant.id)).toBe(7);
    const mv = await db.inventoryMovement.findFirstOrThrow({ where: { referenceId: sale.id } });
    expect(mv).toMatchObject({ type: "VENTA", quantityBefore: 10, quantityChange: -3, quantityAfter: 7, referenceType: "sale" });
  });

  it("venta pendiente no toca el stock", async () => {
    const owner = await makeActor();
    const { variant } = await makeProduct(owner, { stock: 5 });
    await createSale(owner, { channel: "WHATSAPP", items: [{ variantId: variant.id, quantity: 2 }] });
    expect(await onHand(variant.id)).toBe(5);
  });

  it("si no hay stock, la venta NO se registra (transacción completa)", async () => {
    const owner = await makeActor();
    const { variant } = await makeProduct(owner, { stock: 2 });
    await expect(createSale(owner, { channel: "TIENDA", confirm: true, items: [{ variantId: variant.id, quantity: 3 }] })).rejects.toMatchObject({
      code: "INSUFFICIENT_STOCK",
    });
    expect(await db.sale.count()).toBe(0);
    expect(await onHand(variant.id)).toBe(2);
  });

  it("cancelar revierte el stock exactamente una vez", async () => {
    const owner = await makeActor();
    const { variant } = await makeProduct(owner, { stock: 10 });
    const sale = await createSale(owner, { channel: "TIENDA", confirm: true, items: [{ variantId: variant.id, quantity: 4 }] });
    await transitionSale(owner, sale.id, "CANCELADA", "Cliente desistió");
    expect(await onHand(variant.id)).toBe(10);
    await expect(transitionSale(owner, sale.id, "CANCELADA")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(await onHand(variant.id)).toBe(10);
    const types = (await db.inventoryMovement.findMany({ where: { referenceId: sale.id }, orderBy: { createdAt: "asc" } })).map((m) => m.type);
    expect(types).toEqual(["VENTA", "CANCELACION"]);
  });

  it("confirmaciones concurrentes no descuentan dos veces", async () => {
    const owner = await makeActor();
    const { variant } = await makeProduct(owner, { stock: 10 });
    const sale = await createSale(owner, { channel: "TIENDA", items: [{ variantId: variant.id, quantity: 2 }] });
    const results = await Promise.allSettled([transitionSale(owner, sale.id, "CONFIRMADA"), transitionSale(owner, sale.id, "CONFIRMADA")]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await onHand(variant.id)).toBe(8);
  });

  it("idempotencia: la misma clave no duplica la venta", async () => {
    const owner = await makeActor();
    const { variant } = await makeProduct(owner, { stock: 10 });
    const input = { idempotencyKey: "form-123", channel: "TIENDA", confirm: true, items: [{ variantId: variant.id, quantity: 1 }] };
    const a = await createSale(owner, input);
    const b = await createSale(owner, input);
    expect(a.id).toBe(b.id);
    expect(await onHand(variant.id)).toBe(9);
  });

  it("devolución repone stock y pagos actualizan estado", async () => {
    const owner = await makeActor();
    const { variant } = await makeProduct(owner, { stock: 5, price: "500" });
    const sale = await createSale(owner, { channel: "TIENDA", confirm: true, items: [{ variantId: variant.id, quantity: 1 }] });
    await recordPayment(owner, sale.id, { amount: "200", method: "Efectivo" });
    expect((await db.sale.findUniqueOrThrow({ where: { id: sale.id } })).paymentStatus).toBe("PARCIAL");
    await expect(recordPayment(owner, sale.id, { amount: "400", method: "Efectivo" })).rejects.toMatchObject({ code: "VALIDATION" });
    await recordPayment(owner, sale.id, { amount: "300", method: "Efectivo" });
    expect((await db.sale.findUniqueOrThrow({ where: { id: sale.id } })).paymentStatus).toBe("PAGADA");
    await transitionSale(owner, sale.id, "ENTREGADA");
    await transitionSale(owner, sale.id, "DEVUELTA");
    expect(await onHand(variant.id)).toBe(5);
  });

  it("sin costo registrado: la utilidad queda vacía y se notifica", async () => {
    const owner = await makeActor();
    const { variant } = await makeProduct(owner, { stock: 5 });
    const sale = await createSale(owner, { channel: "TIENDA", confirm: true, items: [{ variantId: variant.id, quantity: 1 }] });
    expect(sale.grossProfit).toBeNull();
    expect(await db.notification.count({ where: { type: "MISSING_COST" } })).toBe(1);
  });
});

describe("compras", () => {
  it("crear compra no toca stock; recibir suma stock con costo real y promedio ponderado", async () => {
    const owner = await makeActor();
    const { variant } = await makeProduct(owner, { stock: 10, cost: "300" });
    const purchase = await createPurchase(owner, {
      status: "ORDENADA",
      shippingCost: "300",
      taxes: "200",
      items: [{ variantId: variant.id, quantity: 10, unitCost: "350" }],
    });
    expect(purchase.code).toBe("TEL-C-00001");
    expect(purchase.total.toFixed(2)).toBe("4000.00");
    expect(await onHand(variant.id)).toBe(10);

    await transitionPurchase(owner, purchase.id, "RECIBIDA");
    expect(await onHand(variant.id)).toBe(20);
    const item = await db.purchaseItem.findFirstOrThrow({ where: { purchaseId: purchase.id } });
    expect(item.landedUnitCost?.toFixed(2)).toBe("400.00"); // (3500 + 500) / 10
    const updated = await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
    expect(updated.cost?.toFixed(2)).toBe("350.00"); // (10×300 + 10×400) / 20

    await expect(transitionPurchase(owner, purchase.id, "RECIBIDA")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(await onHand(variant.id)).toBe(20);
  });
});

describe("inventario", () => {
  it("ajustes manuales con historial y alerta de stock bajo", async () => {
    const owner = await makeActor();
    const { variant } = await makeProduct(owner, { stock: 10, min: 3 });
    await adjustStock(owner, { variantId: variant.id, type: "DANO", quantity: 2, reason: "Mancha" });
    await adjustStock(owner, { variantId: variant.id, type: "CORRECCION", quantity: 3, reason: "Conteo físico" });
    expect(await onHand(variant.id)).toBe(3);
    expect(await db.notification.count({ where: { type: "STOCK_LOW" } })).toBe(1);
    await expect(adjustStock(owner, { variantId: variant.id, type: "PERDIDA", quantity: 4, reason: "Robo" })).rejects.toMatchObject({
      code: "INSUFFICIENT_STOCK",
    });
    const audits = await db.auditLog.count({ where: { action: "inventory.adjust" } });
    expect(audits).toBe(2);
  });

  it("la base de datos impide stock negativo y editar movimientos", async () => {
    const owner = await makeActor();
    const { variant } = await makeProduct(owner, { stock: 1 });
    await expect(db.inventory.update({ where: { variantId: variant.id }, data: { onHand: -1 } })).rejects.toThrow();
    await expect(db.inventoryMovement.updateMany({ data: { quantityChange: 99 } })).rejects.toThrow(/inmutable/);
  });
});

describe("permisos en servidor", () => {
  it("rol SALES no puede ajustar inventario ni recibir compras", async () => {
    const owner = await makeActor();
    const sales = await makeActor("SALES");
    const { variant } = await makeProduct(owner);
    await expect(adjustStock(sales, { variantId: variant.id, type: "AJUSTE", quantity: 1, reason: "x x x" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const p = await createPurchase(owner, { items: [{ variantId: variant.id, quantity: 1, unitCost: "1" }] });
    await expect(transitionPurchase(sales, p.id, "RECIBIDA")).rejects.toMatchObject({ code: "FORBIDDEN" });
    // pero sí puede vender
    await expect(createSale(sales, { channel: "TIENDA", confirm: true, items: [{ variantId: variant.id, quantity: 1 }] })).resolves.toBeTruthy();
    // y no puede cancelar una venta confirmada
    const s = await db.sale.findFirstOrThrow();
    await expect(transitionSale(sales, s.id, "CANCELADA")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
