"use server";

import { revalidatePath } from "next/cache";
import { createProduct, updateProduct, archiveProduct } from "@/server/services/products";
import { addProductImage, removeProductImage, setCoverImage, moveProductImage } from "@/server/services/images";
import { runAction, type ActionResult } from "./run";

export async function saveProductAction(productId: string | null, payload: unknown): Promise<ActionResult<{ id: string }>> {
  const result = await runAction(async (actor) => {
    const product = productId ? await updateProduct(actor, productId, payload) : await createProduct(actor, payload);
    return { id: product.id };
  });
  if (result.ok) revalidatePath("/admin/productos");
  return result;
}

export async function archiveProductAction(productId: string) {
  const result = await runAction((actor) => archiveProduct(actor, productId));
  revalidatePath("/admin/productos");
  return result;
}

export async function uploadImagesAction(productId: string, _: unknown, form: FormData): Promise<ActionResult> {
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const result = await runAction(async (actor) => {
    for (const file of files) await addProductImage(actor, productId, file);
  });
  revalidatePath(`/admin/productos/${productId}`);
  return result.ok ? { ok: true, message: `${files.length} foto(s) subida(s).` } : result;
}

export async function imageOpAction(productId: string, imageId: string, op: "cover" | "remove" | "up" | "down") {
  const result = await runAction(async (actor) => {
    if (op === "cover") return setCoverImage(actor, imageId);
    if (op === "remove") return removeProductImage(actor, imageId);
    return moveProductImage(actor, imageId, op === "up" ? -1 : 1);
  });
  revalidatePath(`/admin/productos/${productId}`);
  return result;
}
