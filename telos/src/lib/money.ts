/**
 * Dinero en Lempiras (HNL). Internamente se calcula en CENTAVOS enteros para
 * evitar errores de punto flotante; en la base de datos se guarda Decimal(12,2).
 */

export type Cents = number;

type DecimalLike = { toFixed(digits?: number): string };

/** Convierte "600", "600.5", 600.5 o un Decimal de Prisma a centavos enteros. */
export function toCents(value: string | number | DecimalLike | null | undefined): Cents {
  if (value === null || value === undefined || value === "") return 0;
  const str = typeof value === "number" ? value.toFixed(2) : typeof value === "string" ? value.trim() : value.toFixed(2);
  const match = /^(-)?(\d+)(?:\.(\d{1,}))?$/.exec(str.replace(/,/g, ""));
  if (!match) throw new Error(`Monto inválido: "${str}"`);
  const [, sign, whole = "0", frac = ""] = match;
  const fracPadded = (frac + "000").slice(0, 3);
  // Redondeo half-up al centavo usando el tercer decimal.
  let cents = Number(whole) * 100 + Number(fracPadded.slice(0, 2));
  if (Number(fracPadded[2]) >= 5) cents += 1;
  return sign ? -cents : cents;
}

/** Centavos → string decimal para la base de datos ("600.00"). */
export function fromCents(cents: Cents): string {
  if (!Number.isInteger(cents)) throw new Error("Los centavos deben ser enteros");
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

const formatter = new Intl.NumberFormat("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Formato visible: "L 1,250.00". */
export function formatHNL(value: Cents | string | DecimalLike | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const cents = typeof value === "number" ? value : toCents(value);
  const sign = cents < 0 ? "-" : "";
  return `${sign}L ${formatter.format(Math.abs(cents) / 100)}`;
}

/** Multiplica un monto por una cantidad entera. */
export function multiply(cents: Cents, quantity: number): Cents {
  return Math.round(cents * quantity);
}

/**
 * Reparte `amount` entre partes proporcionalmente a `weights`, sin perder centavos
 * (método del mayor residuo). La suma del resultado es exactamente `amount`.
 */
export function allocate(amount: Cents, weights: number[]): Cents[] {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0) return [];
  if (totalWeight === 0) return allocate(amount, weights.map(() => 1));
  const raw = weights.map((w) => (amount * w) / totalWeight);
  const floors = raw.map(Math.floor);
  let remainder = amount - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i] = (floors[i] ?? 0) + 1;
    remainder--;
  }
  return floors;
}
