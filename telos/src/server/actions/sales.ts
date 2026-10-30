"use server";

import { revalidatePath } from "next/cache";
import type { SaleStatus } from "@prisma/client";
import { createSale, recordPayment, transitionSale } from "@/server/services/sales";
import { runAction, type ActionResult } from "./run";

export async function createSaleAction(payload: unknown): Promise<ActionResult<{ id: string }>> {
  const result = await runAction(async (actor) => ({ id: (await createSale(actor, payload)).id }));
  if (result.ok) revalidatePath("/admin/ventas");
  return result;
}

export async function transitionSaleAction(saleId: string, to: SaleStatus, _: unknown, form: FormData): Promise<ActionResult> {
  const result = await runAction((actor) => transitionSale(actor, saleId, to, String(form.get("reason") ?? "") || undefined));
  revalidatePath(`/admin/ventas/${saleId}`);
  return result.ok ? { ok: true } : result;
}

export async function recordPaymentAction(saleId: string, _: unknown, form: FormData): Promise<ActionResult> {
  const result = await runAction((actor) => recordPayment(actor, saleId, Object.fromEntries(form)));
  revalidatePath(`/admin/ventas/${saleId}`);
  return result.ok ? { ok: true } : result;
}
