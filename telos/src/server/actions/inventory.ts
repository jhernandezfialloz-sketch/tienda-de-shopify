"use server";

import { revalidatePath } from "next/cache";
import { adjustStock } from "@/server/services/inventory";
import { parse } from "@/server/validation/common";
import { adjustmentInput } from "@/server/validation/schemas";
import { runAction, type ActionResult } from "./run";

export async function adjustStockAction(_: unknown, form: FormData): Promise<ActionResult> {
  const result = await runAction(async (actor) => {
    const input = parse(adjustmentInput, Object.fromEntries(form));
    const mv = await adjustStock(actor, input);
    return `Stock ${mv.quantityBefore} → ${mv.quantityAfter}`;
  });
  revalidatePath("/admin/inventario");
  return result.ok ? { ok: true, message: result.data } : result;
}
