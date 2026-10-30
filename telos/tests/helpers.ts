import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import type { Actor } from "@/server/auth/permissions";
import { createProduct } from "@/server/services/products";

export async function resetDb() {
  await db.$executeRawUnsafe(`ALTER TABLE inventory_movements DISABLE TRIGGER inventory_movements_immutable`);
  await db.$executeRawUnsafe(`
    TRUNCATE payments, sale_items, sales, purchase_items, purchases, inventory_movements, inventory,
      product_images, supplier_products, product_variants, products, categories, customers, suppliers,
      notifications, audit_logs, domain_events, sequences, sessions, password_reset_tokens, users CASCADE`);
  await db.$executeRawUnsafe(`ALTER TABLE inventory_movements ENABLE TRIGGER inventory_movements_immutable`);
}

export async function makeActor(role: Role = "OWNER"): Promise<Actor> {
  const user = await db.user.create({
    data: { email: `${role.toLowerCase()}-${Math.random().toString(36).slice(2)}@telos.test`, name: role, role, passwordHash: "x" },
  });
  return { id: user.id, role: user.role, name: user.name };
}

export async function makeProduct(actor: Actor, opts: { stock?: number; price?: string; cost?: string; min?: number; sizes?: string[] } = {}) {
  const category =
    (await db.category.findUnique({ where: { code: "CMT" } })) ??
    (await db.category.create({ data: { name: "Camisetas", code: "CMT", slug: "camisetas" } }));
  const product = await createProduct(actor, {
    name: "Camiseta prueba",
    categoryId: category.id,
    minimumStock: opts.min ?? 0,
    status: "ACTIVE",
    variants: (opts.sizes ?? ["M"]).map((size) => ({
      color: "Negro",
      size,
      price: opts.price ?? "600",
      cost: opts.cost,
      initialStock: opts.stock ?? 10,
    })),
  });
  const variants = await db.productVariant.findMany({ where: { productId: product.id }, orderBy: { sku: "asc" } });
  return { product, variants, variant: variants[0]! };
}

export async function onHand(variantId: string) {
  return (await db.inventory.findUniqueOrThrow({ where: { variantId } })).onHand;
}
