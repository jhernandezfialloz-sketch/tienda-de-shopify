export const TELOS_TIMEZONE = process.env.TELOS_TIMEZONE ?? "America/Tegucigalpa";

const dateTimeFmt = new Intl.DateTimeFormat("es-HN", {
  timeZone: TELOS_TIMEZONE,
  dateStyle: "medium",
  timeStyle: "short",
});
const dateFmt = new Intl.DateTimeFormat("es-HN", { timeZone: TELOS_TIMEZONE, dateStyle: "medium" });

export function formatDateTime(d: Date | string | null | undefined): string {
  return d ? dateTimeFmt.format(new Date(d)) : "—";
}

export function formatDate(d: Date | string | null | undefined): string {
  return d ? dateFmt.format(new Date(d)) : "—";
}

/**
 * Inicio del día (00:00) en la zona de Telos, expresado en UTC.
 * Honduras no usa horario de verano, pero se calcula de forma general.
 */
export function startOfDayInTz(date = new Date(), tz = TELOS_TIMEZONE): Date {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const utcMidnight = new Date(`${parts}T00:00:00Z`);
  const offsetMs = tzOffsetMs(utcMidnight, tz);
  return new Date(utcMidnight.getTime() - offsetMs);
}

function tzOffsetMs(date: Date, tz: string): number {
  const local = new Date(date.toLocaleString("en-US", { timeZone: tz }));
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  return local.getTime() - utc.getTime();
}

export function daysAgo(n: number, from = new Date()): Date {
  return new Date(startOfDayInTz(from).getTime() - n * 86_400_000);
}
