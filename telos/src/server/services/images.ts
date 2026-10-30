import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { db, transaction } from "@/lib/db";
import { TelosError } from "@/lib/errors";
import { slugify } from "@/lib/slug";
import { assertCan, type Actor } from "@/server/auth/permissions";
import { storage } from "@/server/storage";
import { audit } from "./audit";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"];

/** Optimiza (WebP, máx. 1600 px, sin metadatos EXIF) y sube la foto al almacenamiento. */
export async function addProductImage(actor: Actor, productId: string, file: File) {
  assertCan(actor, "products:write");
  if (!ALLOWED.includes(file.type)) throw new TelosError("VALIDATION", `${file.name}: formato no permitido (usa JPG, PNG, WebP o HEIC).`);
  if (file.size > MAX_BYTES) throw new TelosError("VALIDATION", `${file.name}: supera 15 MB.`);
  const product = await db.product.findUnique({ where: { id: productId }, include: { _count: { select: { images: true } } } });
  if (!product) throw new TelosError("NOT_FOUND", "El producto no existe.");

  const input = Buffer.from(await file.arrayBuffer());
  const { data, info } = await sharp(input).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  // El nombre original va en la clave para poder rastrear de qué archivo salió cada foto.
  const original = slugify(file.name.replace(/\.[^.]+$/, "")) || "foto";
  const key = `products/${product.code}/${Date.now()}-${randomBytes(4).toString("hex")}-${original}.webp`;
  const { url } = await storage().put(key, data, "image/webp");

  return transaction(async (tx) => {
    const image = await tx.productImage.create({
      data: {
        productId,
        storageKey: key,
        url,
        alt: product.name,
        position: product._count.images,
        isCover: product._count.images === 0,
        width: info.width,
        height: info.height,
      },
    });
    await audit(tx, { userId: actor.id, action: "product.image_add", entityType: "product", entityId: productId, after: { key } });
    return image;
  });
}

export async function removeProductImage(actor: Actor, imageId: string) {
  assertCan(actor, "products:write");
  const image = await db.productImage.findUnique({ where: { id: imageId } });
  if (!image) throw new TelosError("NOT_FOUND", "La foto no existe.");
  await transaction(async (tx) => {
    await tx.productImage.delete({ where: { id: imageId } });
    if (image.isCover) {
      const next = await tx.productImage.findFirst({ where: { productId: image.productId }, orderBy: { position: "asc" } });
      if (next) await tx.productImage.update({ where: { id: next.id }, data: { isCover: true } });
    }
    await audit(tx, { userId: actor.id, action: "product.image_remove", entityType: "product", entityId: image.productId, before: { key: image.storageKey } });
  });
  await storage().delete(image.storageKey);
}

export async function setCoverImage(actor: Actor, imageId: string) {
  assertCan(actor, "products:write");
  const image = await db.productImage.findUniqueOrThrow({ where: { id: imageId } });
  await transaction(async (tx) => {
    await tx.productImage.updateMany({ where: { productId: image.productId }, data: { isCover: false } });
    await tx.productImage.update({ where: { id: imageId }, data: { isCover: true } });
    await audit(tx, { userId: actor.id, action: "product.image_cover", entityType: "product", entityId: image.productId });
  });
}

export async function moveProductImage(actor: Actor, imageId: string, delta: -1 | 1) {
  assertCan(actor, "products:write");
  const image = await db.productImage.findUniqueOrThrow({ where: { id: imageId } });
  const images = await db.productImage.findMany({ where: { productId: image.productId }, orderBy: { position: "asc" } });
  const idx = images.findIndex((i) => i.id === imageId);
  const swap = images[idx + delta];
  if (!swap) return;
  const reordered = [...images];
  reordered[idx] = swap;
  reordered[idx + delta] = image;
  await transaction(async (tx) => {
    for (const [position, img] of reordered.entries()) await tx.productImage.update({ where: { id: img.id }, data: { position } });
  });
}
