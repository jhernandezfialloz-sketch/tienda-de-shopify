import type { Tx } from "@/lib/db";
import { TelosError } from "@/lib/errors";
import { nextSequence } from "./sequences";

/**
 * Sistema de códigos TELOS
 *   Producto:  TLS-{CAT}-{NNN}             → TLS-CMT-001  (URL pública /productos/TLS-CMT-001)
 *   Variante:  {PRODUCTO}-{COLOR}-{TALLA}   → TLS-CMT-001-BLK-M
 * La secuencia es por categoría. Las variantes heredan el prefijo del producto,
 * así un listado ordenado por SKU agrupa todas las tallas/colores de un modelo.
 */

export const SKU_PATTERN = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

const COLOR_CODES: Record<string, string> = {
  negro: "BLK",
  blanco: "WHT",
  azul: "BLU",
  "azul marino": "NVY",
  marino: "NVY",
  gris: "GRY",
  rojo: "RED",
  verde: "GRN",
  "verde oliva": "OLV",
  beige: "BEI",
  cafe: "BRN",
  marron: "BRN",
  morado: "PUR",
  rosado: "PNK",
  amarillo: "YLW",
  naranja: "ORG",
  celeste: "SKY",
  crema: "CRM",
  multicolor: "MLT",
};

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** "Negro" → BLK; colores no mapeados → primeras letras en mayúscula ("Lila" → LIL). */
export function colorCode(color: string | null | undefined): string | null {
  if (!color || !color.trim()) return null;
  const key = normalize(color);
  const mapped = COLOR_CODES[key];
  if (mapped) return mapped;
  const letters = key.replace(/[^a-z0-9]/g, "").toUpperCase();
  return letters.slice(0, 3) || null;
}

/** "m" → M, "Única"/"unitalla" → U, "32" → 32. */
export function sizeCode(size: string | null | undefined): string | null {
  if (!size || !size.trim()) return null;
  const key = normalize(size).replace(/\s+/g, "");
  if (["unica", "unitalla", "u", "os", "onesize", "ajustable"].includes(key)) return "U";
  return key.replace(/[^a-z0-9]/g, "").toUpperCase() || null;
}

export function formatProductCode(categoryCode: string, sequence: number): string {
  if (!/^[A-Z]{2,4}$/.test(categoryCode)) throw new TelosError("VALIDATION", `Código de categoría inválido: ${categoryCode}`);
  return `TLS-${categoryCode}-${String(sequence).padStart(3, "0")}`;
}

export function buildVariantSku(productCode: string, color?: string | null, size?: string | null): string {
  return [productCode, colorCode(color), sizeCode(size)].filter(Boolean).join("-");
}

/** Normaliza un SKU escrito a mano y valida su formato. */
export function normalizeSku(sku: string): string {
  const clean = sku.trim().toUpperCase().replace(/\s+/g, "-");
  if (!SKU_PATTERN.test(clean)) {
    throw new TelosError("VALIDATION", `SKU inválido "${sku}": usa solo letras, números y guiones (ej. TLS-CMT-001-BLK-M).`);
  }
  return clean;
}

/** Reserva el siguiente código de producto para una categoría (atómico). */
export async function nextProductCode(tx: Tx, categoryCode: string): Promise<string> {
  const seq = await nextSequence(tx, `product:${categoryCode}`);
  return formatProductCode(categoryCode, seq);
}
