import "server-only";
import { currentUser } from "@/server/auth/current";
import { toTelosError } from "@/lib/errors";
import type { SessionUser } from "@/server/auth/sessions";

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

/** Ejecuta una acción del admin con el usuario actual y traduce errores a mensajes útiles. */
export async function runAction<T>(fn: (actor: SessionUser) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const actor = await currentUser();
    if (!actor) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };
    return { ok: true, data: await fn(actor) };
  } catch (err) {
    return { ok: false, error: toTelosError(err).message };
  }
}
