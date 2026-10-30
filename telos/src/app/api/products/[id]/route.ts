import { TelosError } from "@/lib/errors";
import { api, body } from "@/server/api";
import { assertCan } from "@/server/auth/permissions";
import { archiveProduct, getProduct, updateProduct } from "@/server/services/products";

export const GET = api<{ id: string }>(async ({ user, params }) => {
  assertCan(user, "products:read");
  const product = await getProduct(params.id);
  if (!product) throw new TelosError("NOT_FOUND", "El producto no existe.");
  return product;
});

/** PATCH reemplaza los datos editables (mismo formato que POST). El stock NO se cambia aquí. */
export const PATCH = api<{ id: string }>(async ({ req, user, params }) => updateProduct(user, params.id, await body(req)));

/** DELETE = archivar (soft delete). */
export const DELETE = api<{ id: string }>(async ({ user, params }) => archiveProduct(user, params.id));
