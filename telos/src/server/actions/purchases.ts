"use server";

import { revalidatePath } from "next/cache";
import type { PurchaseStatus } from "@prisma/client";
import { createPurchase, transitionPurchase } from "@/server/services/purchases";
import { runAction, type ActionResult } from "./run";

export async function createPurchaseAction(payload: unknown): Promise<ActionResult<{ id: string }>> {
  const result = await runAction(async (actor) => ({ id: (await createPurchase(actor, payload)).id }));
  if (result.ok) revalidatePath("/admin/compras");
  return result;
}

export async function transitionPurchaseAction(purchaseId: string, to: PurchaseStatus): Promise<ActionResult> {
  const result = await runAction((actor) => transitionPurchase(actor, purchaseId, to));
  revalidatePath(`/admin/compras/${purchaseId}`);
  return result.ok ? { ok: true } : result;
}
