import type { Tx } from "@/lib/db";

/** Incrementa y devuelve el siguiente valor de un contador, de forma atómica. */
export async function nextSequence(tx: Tx, name: string): Promise<number> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO sequences (name, value) VALUES (${name}, 1)
    ON CONFLICT (name) DO UPDATE SET value = sequences.value + 1
    RETURNING value`;
  const value = rows[0]?.value;
  if (value === undefined) throw new Error(`No se pudo obtener la secuencia ${name}`);
  return Number(value);
}

export async function nextSaleCode(tx: Tx): Promise<string> {
  return `TEL-V-${String(await nextSequence(tx, "sale")).padStart(5, "0")}`;
}

export async function nextPurchaseCode(tx: Tx): Promise<string> {
  return `TEL-C-${String(await nextSequence(tx, "purchase")).padStart(5, "0")}`;
}
