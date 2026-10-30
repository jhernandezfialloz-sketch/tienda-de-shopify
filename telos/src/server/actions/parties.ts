"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createCustomer, createSupplier } from "@/server/services/parties";
import { runAction, type ActionResult } from "./run";

export async function createCustomerAction(_: unknown, form: FormData): Promise<ActionResult> {
  const result = await runAction((actor) => createCustomer(actor, Object.fromEntries(form)));
  revalidatePath("/admin/clientes");
  return result.ok ? { ok: true, message: "Cliente creado." } : result;
}

export async function createSupplierAction(_: unknown, form: FormData): Promise<ActionResult> {
  const result = await runAction((actor) => createSupplier(actor, Object.fromEntries(form)));
  revalidatePath("/admin/proveedores");
  return result.ok ? { ok: true, message: "Proveedor creado." } : result;
}

export async function markNotificationsReadAction() {
  await runAction(() => db.notification.updateMany({ where: { readAt: null }, data: { readAt: new Date() } }));
  revalidatePath("/admin", "layout");
}
