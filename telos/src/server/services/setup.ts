import { readFile } from "node:fs/promises";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { TelosError } from "@/lib/errors";
import { assertCan, type Actor } from "@/server/auth/permissions";
import { hashPassword } from "@/server/auth/password";
import { INITIAL_PRODUCTS } from "@/server/setup/initial-inventory-data";
import { createProduct } from "./products";
import { addProductImage, setCoverImage } from "./images";

/** Categorías reales con su código de SKU. */
export const BASE_CATEGORIES = [
  { name: "Camisas", code: "CAM", slug: "camisas", sortOrder: 1 },
  { name: "Camisetas", code: "CMT", slug: "camisetas", sortOrder: 2 },
  { name: "Polos", code: "POL", slug: "polos", sortOrder: 3 },
  { name: "Pantalones", code: "PAN", slug: "pantalones", sortOrder: 4 },
  { name: "Gorras", code: "GOR", slug: "gorras", sortOrder: 5 },
  { name: "Accesorios", code: "ACC", slug: "accesorios", sortOrder: 6 },
];

/** Categorías y configuración base. Idempotente: no modifica lo que ya existe. */
export async function ensureBaseData() {
  for (const c of BASE_CATEGORIES) await db.category.upsert({ where: { code: c.code }, update: {}, create: c });
  await db.setting.upsert({
    where: { key: "company" },
    update: {},
    create: { key: "company", value: { name: "Distribuidora Telos", brand: "TELOS", currency: "HNL", country: "HN", timezone: "America/Tegucigalpa" } },
  });
}

export async function needsFirstOwner() {
  return (await db.user.count()) === 0;
}

function tokenMatches(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Primer uso en producción: crea el usuario dueño desde el navegador.
 * Solo funciona mientras no exista ningún usuario y con la clave SETUP_TOKEN del servidor.
 */
export async function createFirstOwner(input: { token: string; name: string; email: string; password: string }) {
  const expected = process.env.SETUP_TOKEN;
  if (!expected || expected.length < 12) throw new TelosError("FORBIDDEN", "El servidor no tiene SETUP_TOKEN configurado (mínimo 12 caracteres). Ver docs/PUBLICAR.md.");
  if (!tokenMatches(input.token.trim(), expected)) throw new TelosError("FORBIDDEN", "La clave de configuración no es correcta.");
  if (input.name.trim().length < 2) throw new TelosError("VALIDATION", "Escribe tu nombre.");
  if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) throw new TelosError("VALIDATION", "Correo inválido.");
  const passwordHash = await hashPassword(input.password);

  const user = await db.$transaction(async (tx) => {
    // Bloqueo para que dos solicitudes simultáneas no creen dos dueños.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(724001)`;
    if ((await tx.user.count()) > 0) throw new TelosError("CONFLICT", "El sistema ya fue configurado. Inicia sesión.");
    const created = await tx.user.create({ data: { email: input.email.trim().toLowerCase(), name: input.name.trim(), role: "OWNER", passwordHash } });
    await tx.auditLog.create({ data: { userId: created.id, action: "user.create", entityType: "user", entityId: created.id, after: { email: created.email, role: "OWNER", via: "primer-uso" } } });
    return created;
  });
  await ensureBaseData();
  return user;
}

/** Sube las fotos que el producto aún no tiene (reconoce el archivo por su nombre en la clave). La primera es la portada. */
async function syncPhotos(actor: Actor, productId: string, photos: string[]) {
  const existing = await db.productImage.findMany({ where: { productId }, select: { storageKey: true } });
  const tag = (file: string) => slugify(file.replace(/\.[^.]+$/, ""));
  let added = 0;
  for (const photo of photos) {
    if (existing.some((img) => img.storageKey.endsWith(`-${tag(photo)}.webp`))) continue;
    const buf = await readFile(path.join(process.cwd(), "fotos-productos", photo));
    await addProductImage(actor, productId, new File([buf], photo, { type: "image/jpeg" }));
    added++;
  }
  if (added > 0 && photos[0]) {
    const images = await db.productImage.findMany({ where: { productId }, orderBy: { position: "asc" } });
    const cover = images.find((img) => img.storageKey.endsWith(`-${tag(photos[0]!)}.webp`));
    if (cover && !cover.isCover) {
      await setCoverImage(actor, cover.id);
      for (const [i, img] of [cover, ...images.filter((x) => x.id !== cover.id)].entries()) {
        await db.productImage.update({ where: { id: img.id }, data: { position: i } });
      }
    }
  }
  return added;
}

/**
 * Carga los 10 productos reales de las fotos (docs/INVENTARIO-INICIAL.md) en BORRADOR.
 * Idempotente: si un producto ya existe, solo completa sus fotos.
 */
export async function loadInitialInventory(actor: Actor) {
  assertCan(actor, "products:write");
  await ensureBaseData();
  const categories = Object.fromEntries((await db.category.findMany()).map((c) => [c.code, c.id]));
  const log: string[] = [];
  for (const seed of INITIAL_PRODUCTS) {
    const existing = await db.product.findFirst({ where: { name: seed.name } });
    if (existing) {
      const added = await syncPhotos(actor, existing.id, seed.photos);
      log.push(`· ya existe: ${existing.code} ${seed.name}${added ? ` (+${added} foto/s)` : ""}`);
      continue;
    }
    const product = await createProduct(actor, {
      name: seed.name,
      categoryId: categories[seed.category],
      brand: seed.brand,
      description: seed.description,
      internalNotes: seed.notes,
      status: "DRAFT",
      variants: [{ color: seed.color }],
    });
    const added = await syncPhotos(actor, product.id, seed.photos);
    log.push(`✓ ${product.code} ${seed.name} (${added} foto/s)`);
  }
  return log;
}
