import { describe, expect, it } from "vitest";
import { allocate, formatHNL, fromCents, toCents } from "@/lib/money";
import { grossMargin, averageOrderValue, unitMargin, sellThroughRate } from "@/lib/metrics";
import { buildVariantSku, colorCode, formatProductCode, normalizeSku, sizeCode } from "@/server/services/sku";
import { computeProfit, computeSaleTotals, assertSaleTransition, paymentStatusFor } from "@/server/services/sale-rules";
import { computeLandedCosts, weightedAverageCost, assertPurchaseTransition } from "@/server/services/purchase-rules";
import { resolveAdjustment } from "@/server/services/inventory";
import { assertCan, can } from "@/server/auth/permissions";

describe("dinero", () => {
  it("convierte sin errores de punto flotante", () => {
    expect(toCents("600")).toBe(60000);
    expect(toCents("0.1")).toBe(10);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents("1,250.505")).toBe(125051);
    expect(fromCents(60000)).toBe("600.00");
    expect(fromCents(5)).toBe("0.05");
  });
  it("formatea en Lempiras", () => {
    expect(formatHNL(125000)).toBe("L 1,250.00");
    expect(formatHNL(null)).toBe("—");
  });
  it("reparte montos sin perder centavos", () => {
    const parts = allocate(100, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(parts.sort()).toEqual([33, 33, 34]);
  });
});

describe("SKU", () => {
  it("genera códigos de producto y variante", () => {
    expect(formatProductCode("CMT", 1)).toBe("TLS-CMT-001");
    expect(buildVariantSku("TLS-CMT-001", "Negro", "m")).toBe("TLS-CMT-001-BLK-M");
    expect(buildVariantSku("TLS-GOR-003", "Azul marino", "Única")).toBe("TLS-GOR-003-NVY-U");
    expect(buildVariantSku("TLS-GOR-003", null, null)).toBe("TLS-GOR-003");
  });
  it("normaliza colores y tallas", () => {
    expect(colorCode("Lila")).toBe("LIL");
    expect(colorCode("blanco")).toBe("WHT");
    expect(sizeCode(" xl ")).toBe("XL");
  });
  it("valida SKU manual", () => {
    expect(normalizeSku(" tls cmt 001 ")).toBe("TLS-CMT-001");
    expect(() => normalizeSku("TLS_CMT")).toThrow(/SKU inválido/);
  });
});

describe("márgenes y métricas", () => {
  it("calcula margen bruto o reporta falta de datos", () => {
    expect(grossMargin(100000, 60000)).toEqual({ ok: true, value: 40 });
    expect(grossMargin(0, 0)).toEqual({ ok: false, reason: "No hay suficientes datos" });
    expect(averageOrderValue(0, 0).ok).toBe(false);
    expect(sellThroughRate(5, 20)).toEqual({ ok: true, value: 25 });
  });
  it("margen unitario", () => {
    expect(unitMargin(60000, 35000)).toEqual({ amount: 25000, percent: 41.7 });
    expect(unitMargin(60000, null)).toBeNull();
  });
});

describe("reglas de ventas", () => {
  it("totales con descuentos", () => {
    const t = computeSaleTotals([{ quantity: 2, unitPrice: 60000, discount: 5000 }, { quantity: 1, unitPrice: 40000, discount: 0 }], 10000);
    expect(t).toEqual({ lineTotals: [115000, 40000], subtotal: 155000, discount: 10000, total: 145000 });
    expect(() => computeSaleTotals([{ quantity: 1, unitPrice: 100, discount: 0 }], 200)).toThrow();
  });
  it("utilidad no se inventa si falta costo", () => {
    expect(computeProfit(100000, [{ quantity: 2, unitCost: 30000 }])).toEqual({ costTotal: 60000, grossProfit: 40000 });
    expect(computeProfit(100000, [{ quantity: 2, unitCost: null }])).toEqual({ costTotal: null, grossProfit: null });
  });
  it("transiciones válidas e inválidas", () => {
    expect(() => assertSaleTransition("PENDIENTE", "CONFIRMADA")).not.toThrow();
    expect(() => assertSaleTransition("CANCELADA", "CONFIRMADA")).toThrow(/no puede pasar/);
    expect(() => assertSaleTransition("PENDIENTE", "DEVUELTA")).toThrow();
  });
  it("estado de pago", () => {
    expect(paymentStatusFor(0, 100)).toBe("PENDIENTE");
    expect(paymentStatusFor(50, 100)).toBe("PARCIAL");
    expect(paymentStatusFor(100, 100)).toBe("PAGADA");
  });
});

describe("reglas de compras", () => {
  it("costo real unitario = (mercancía + extras) / unidades", () => {
    // 10 camisetas a L 300 + L 500 de transporte e impuestos → L 350 c/u
    expect(computeLandedCosts([{ quantity: 10, unitCost: 30000 }], 50000)).toEqual([{ lineTotal: 350000, landedUnitCost: 35000 }]);
  });
  it("prorratea extras según valor de cada línea", () => {
    const r = computeLandedCosts([{ quantity: 1, unitCost: 30000 }, { quantity: 1, unitCost: 10000 }], 4000);
    expect(r.map((x) => x.landedUnitCost)).toEqual([33000, 11000]);
  });
  it("costo promedio ponderado", () => {
    expect(weightedAverageCost(10, 30000, 10, 40000)).toBe(35000);
    expect(weightedAverageCost(0, null, 5, 40000)).toBe(40000);
  });
  it("RECIBIDA es final", () => {
    expect(() => assertPurchaseTransition("RECIBIDA", "CANCELADA")).toThrow();
  });
});

describe("ajustes manuales", () => {
  it("resuelve el signo correcto", () => {
    expect(resolveAdjustment({ variantId: "x", type: "CORRECCION", quantity: 7, reason: "conteo" }, 10)).toBe(-3);
    expect(resolveAdjustment({ variantId: "x", type: "DANO", quantity: 2, reason: "r" }, 10)).toBe(-2);
    expect(resolveAdjustment({ variantId: "x", type: "AJUSTE", quantity: 2, direction: "out", reason: "r" }, 10)).toBe(-2);
    expect(resolveAdjustment({ variantId: "x", type: "DEVOLUCION", quantity: 1, reason: "r" }, 10)).toBe(1);
  });
});

describe("permisos", () => {
  it("matriz por rol", () => {
    expect(can("OWNER", "users:manage")).toBe(true);
    expect(can("ADMIN", "users:manage")).toBe(false);
    expect(can("SALES", "sales:write")).toBe(true);
    expect(can("SALES", "inventory:adjust")).toBe(false);
    expect(can("SALES", "finance:read")).toBe(false);
    expect(can("INVENTORY", "purchases:receive")).toBe(true);
    expect(can("MARKETING", "products:write")).toBe(false);
  });
  it("assertCan lanza errores claros", () => {
    expect(() => assertCan(null, "sales:read")).toThrow(/iniciar sesión/);
    expect(() => assertCan({ id: "1", role: "SALES", name: "x" }, "inventory:adjust")).toThrow(/no tiene permiso/);
  });
});
