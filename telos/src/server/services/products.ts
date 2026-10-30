import type { Prisma } from "@prisma/client";
import { db, transaction, type Tx } from "@/lib/db";
import { TelosError } from "@/lib/errors";
import { fromCents, toCents } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { assertCan, type Actor } from "@/server/auth/permissions";
import { parse } from "@/server/validation/common";
import { productInput, type ProductInput } from "@/server/validation/schemas";
import { audit, emit } from "./audit";
import { applyStockChange } from "./inventory";
import { buildVariantSku, nextProductCode, normalizeSku } from "./sku";

type VariantInput = ProductInput["variants"][number];

function priceOrNull(v: string | undefined) {
  return v === undefined ? null : fromCents(toCents(v));
}

function assertUniqueCombos(variants: VariantInput[]) {
  const seen = new Set<string>();
  for (const v of variants) {
    const key = `${(v.color ?? "").toLowerCase()}|${(v.size ?? "").toLowerCase()}`;
    if (seen.has(key)) throw new TelosError("VALIDATION", `Variante repetida: ${v.color ?? "sin color"} / ${v.size ?? "sin talla"}.`);
    seen.add(key);
  }
}

async function uniqueSlug(tx: Tx, base: string, code: string): Promise<string> {
  const slug = slugify(`${base}-${code}`);
  const exists = await tx.product.findUnique({ where: { slug } });
  return exists ? `${slug}-${Date.now().toString(36)}` : slug;
}

export async function createProduct(actor: Actor, raw: unknown, opts: { isDemo?: boolean } = {}) {
  assertCan(actor, "products:write");
  const input = parse(productInput, raw);
  assertUniqueCombos(input.variants);

  return transaction(async (tx) => {
    const category = await tx.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new TelosError("VALIDATION", "La categoría no existe.");
    const code = await nextProductCode(tx, category.code);
    const product = await tx.product.create({
      data: {
        code,
        name: input.name,
        slug: await uniqueSlug(tx, input.name, code),
        categoryId: category.id,
        brand: input.brand,
        description: input.description,
        material: input.material,
        status: input.status,
        minimumStock: input.minimumStock,
        internalNotes: input.internalNotes,
        isDemo: opts.isDemo ?? false,
      },
    });
    for (const v of input.variants) {
      const variant = await tx.productVariant.create({
        data: {
          productId: product.id,
          sku: v.sku ? normalizeSku(v.sku) : buildVariantSku(code, v.color, v.size),
          color: v.color ?? null,
          size: v.size ?? null,
          barcode: v.barcode ?? null,
          price: priceOrNull(v.price),
          cost: priceOrNull(v.cost),
          minimumStock: v.minimumStock ?? null,
          isDemo: opts.isDemo ?? false,
          inventory: { create: { onHand: 0 } },
        },
      });
      if (v.initialStock && v.initialStock > 0) {
        assertCan(actor, "inventory:adjust");
        await applyStockChange(tx, {
          variantId: variant.id,
          change: v.initialStock,
          type: "INICIAL",
          reason: "Stock inicial al crear el producto",
          unitCost: v.cost ? toCents(v.cost) : null,
          userId: actor.id,
          isDemo: opts.isDemo,
        });
      }
    }
    await audit(tx, { userId: actor.id, action: "product.create", entityType: "product", entityId: product.id, after: input });
    await emit(tx, "PRODUCT_CREATED", { productId: product.id, code });
    return product;
  });
}

/**
 * Edita datos del producto y sus variantes. El STOCK no se modifica aquí:
 * solo desde Inventario (con movimiento y razón).
 */
export async function updateProduct(actor: Actor, productId: string, raw: unknown) {
  assertCan(actor, "products:write");
  const input = parse(productInput, raw);
  assertUniqueCombos(input.variants);

  return transaction(async (tx) => {
    const before = await tx.product.findUnique({ where: { id: productId }, include: { variants: true } });
    if (!before) throw new TelosError("NOT_FOUND", "El producto no existe.");
    const category = await tx.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new TelosError("VALIDATION", "La categoría no existe.");

    const product = await tx.product.update({
      where: { id: productId },
      data: {
        name: input.name,
        categoryId: input.categoryId,
        brand: input.brand ?? null,
        description: input.description ?? null,
        material: input.material ?? null,
        status: input.status,
        archivedAt: input.status === "ARCHIVED" ? (before.archivedAt ?? new Date()) : null,
        minimumStock: input.minimumStock,
        internalNotes: input.internalNotes ?? null,
      },
    });

    for (const v of input.variants) {
      const data: Prisma.ProductVariantUncheckedUpdateInput = {
        color: v.color ?? null,
        size: v.size ?? null,
        barcode: v.barcode ?? null,
        price: priceOrNull(v.price),
        cost: priceOrNull(v.cost),
        minimumStock: v.minimumStock ?? null,
        active: v.active ?? true,
      };
      if (v.id) {
        const existing = before.variants.find((x) => x.id === v.id);
        if (!existing) throw new TelosError("VALIDATION", "Una variante no pertenece a este producto.");
        if (v.sku) data.sku = normalizeSku(v.sku);
        await tx.productVariant.update({ where: { id: v.id }, data });
      } else {
        const variant = await tx.productVariant.create({
          data: {
            productId,
            sku: v.sku ? normalizeSku(v.sku) : buildVariantSku(before.code, v.color, v.size),
            color: v.color ?? null,
            size: v.size ?? null,
            barcode: v.barcode ?? null,
            price: priceOrNull(v.price),
            cost: priceOrNull(v.cost),
            minimumStock: v.minimumStock ?? null,
            isDemo: before.isDemo,
            inventory: { create: { onHand: 0 } },
          },
        });
        if (v.initialStock && v.initialStock > 0) {
          assertCan(actor, "inventory:adjust");
          await applyStockChange(tx, {
            variantId: variant.id,
            change: v.initialStock,
            type: "INICIAL",
            reason: "Stock inicial de variante nueva",
            unitCost: v.cost ? toCents(v.cost) : null,
            userId: actor.id,
            isDemo: before.isDemo,
          });
        }
      }
    }

    await audit(tx, {
      userId: actor.id,
      action: "product.update",
      entityType: "product",
      entityId: productId,
      before: {
        name: before.name,
        status: before.status,
        variants: before.variants.map((v) => ({ sku: v.sku, price: v.price, cost: v.cost, active: v.active })),
      },
      after: input,
    });
    await emit(tx, "PRODUCT_UPDATED", { productId });
    return product;
  });
}

/** "Eliminar" = archivar (soft delete). El historial de ventas/movimientos se conserva. */
export async function archiveProduct(actor: Actor, productId: string) {
  assertCan(actor, "products:write");
  return transaction(async (tx) => {
    const product = await tx.product.update({ where: { id: productId }, data: { status: "ARCHIVED", archivedAt: new Date() } });
    await audit(tx, { userId: actor.id, action: "product.archive", entityType: "product", entityId: productId });
    return product;
  });
}

// ───────── Consultas ─────────

export async function listProducts(params: { q?: string; categoryId?: string; status?: string; page?: number; pageSize?: number }) {
  const pageSize = Math.min(params.pageSize ?? 25, 100);
  const page = Math.max(params.page ?? 1, 1);
  const where: Prisma.ProductWhereInput = {
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    ...(params.status ? { status: params.status as "DRAFT" | "ACTIVE" | "ARCHIVED" } : { status: { not: "ARCHIVED" } }),
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" } },
            { code: { contains: params.q, mode: "insensitive" } },
            { brand: { contains: params.q, mode: "insensitive" } },
            { variants: { some: { sku: { contains: params.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const [total, items] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { code: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: true,
        images: { where: { isCover: true }, take: 1 },
        variants: { where: { active: true }, include: { inventory: true }, orderBy: { sku: "asc" } },
      },
    }),
  ]);
  return { total, page, pageSize, items };
}

export function getProduct(idOrCode: string) {
  return db.product.findFirst({
    where: { OR: [{ id: idOrCode }, { code: idOrCode.toUpperCase() }] },
    include: {
      category: true,
      images: { orderBy: { position: "asc" } },
      variants: { include: { inventory: true }, orderBy: { sku: "asc" } },
    },
  });
}

/** Búsqueda rápida de variantes vendibles (formularios de venta/compra, Cmd+K). */
export async function searchVariants(q: string, limit = 12) {
  const term = q.trim();
  if (!term) return [];
  return db.productVariant.findMany({
    where: {
      active: true,
      product: { status: { not: "ARCHIVED" } },
      OR: [
        { sku: { contains: term, mode: "insensitive" } },
        { barcode: term },
        { product: { name: { contains: term, mode: "insensitive" } } },
        { product: { code: { contains: term, mode: "insensitive" } } },
      ],
    },
    take: limit,
    orderBy: { sku: "asc" },
    include: { product: { select: { name: true, code: true } }, inventory: true },
  });
}
