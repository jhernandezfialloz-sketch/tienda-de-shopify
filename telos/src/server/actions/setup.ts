"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { toTelosError } from "@/lib/errors";
import { login, SESSION_COOKIE } from "@/server/auth/sessions";
import { createFirstOwner, loadInitialInventory } from "@/server/services/setup";
import { runAction, type ActionResult } from "./run";

export async function firstOwnerAction(_: unknown, form: FormData) {
  const email = String(form.get("email") ?? "");
  const name = String(form.get("name") ?? "");
  const password = String(form.get("password") ?? "");
  // Se devuelven nombre y correo para no obligar a escribirlos de nuevo tras un error.
  if (password !== String(form.get("confirm") ?? "")) return { error: "Las contraseñas no coinciden.", name, email };
  try {
    await createFirstOwner({ token: String(form.get("token") ?? ""), name, email, password });
    const h = await headers();
    const { token, expiresAt } = await login(email, password, { userAgent: h.get("user-agent") ?? undefined });
    (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
  } catch (err) {
    return { error: toTelosError(err).message, name, email };
  }
  redirect("/admin");
}

/** Procesa una tanda pequeña (2 productos) para no pasar el límite de tiempo por solicitud. */
export async function loadInitialInventoryAction(): Promise<ActionResult<{ remaining: number; total: number }>> {
  const result = await runAction(async (actor) => {
    const { remaining, total } = await loadInitialInventory(actor, { batchSize: 2 });
    return { remaining, total };
  });
  if (result.ok && result.data?.remaining === 0) revalidatePath("/admin", "layout");
  return result;
}
