import { z } from "zod";
import { TelosError } from "@/lib/errors";

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/** Texto opcional: "" → undefined, recortado. */
export const optionalText = (max = 500) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

/** Monto en Lempiras como string decimal con máx. 2 decimales ("600" | "600.50"). */
export const money = z.preprocess(
  (v) => (typeof v === "number" ? String(v) : typeof v === "string" ? v.trim().replace(/,/g, "") : v),
  z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, { message: "Monto inválido (usa números, máx. 2 decimales)" }),
);
export const optionalMoney = z.preprocess(emptyToUndefined, money.optional());

export const positiveInt = z.coerce.number().int({ message: "Debe ser un número entero" }).positive({ message: "Debe ser mayor que 0" });
export const nonNegativeInt = z.coerce.number().int({ message: "Debe ser un número entero" }).min(0, { message: "No puede ser negativo" });

/** Valida y lanza TelosError("VALIDATION") con detalle por campo. */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fields = result.error.issues.map((i) => `${i.path.join(".") || "datos"}: ${i.message}`);
    throw new TelosError("VALIDATION", `Revisa los datos: ${fields.join("; ")}`, result.error.issues);
  }
  return result.data;
}
