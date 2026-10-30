/**
 * Error de negocio con mensaje útil para el usuario (en español) y un código estable
 * que las APIs y agentes de IA pueden interpretar.
 */
export class TelosError extends Error {
  constructor(
    public readonly code:
      | "VALIDATION"
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "UNAUTHENTICATED"
      | "CONFLICT"
      | "INSUFFICIENT_STOCK"
      | "INVALID_TRANSITION"
      | "INTERNAL",
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "TelosError";
  }
}

export const httpStatus: Record<TelosError["code"], number> = {
  VALIDATION: 422,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHENTICATED: 401,
  CONFLICT: 409,
  INSUFFICIENT_STOCK: 409,
  INVALID_TRANSITION: 409,
  INTERNAL: 500,
};

/** Traduce errores conocidos de Prisma/Postgres a TelosError legibles. */
export function toTelosError(err: unknown): TelosError {
  if (err instanceof TelosError) return err;
  const e = err as { code?: string; meta?: { target?: unknown }; message?: string };
  if (e?.code === "P2002") {
    const target = Array.isArray(e.meta?.target) ? e.meta?.target.join(", ") : String(e.meta?.target ?? "");
    return new TelosError("CONFLICT", `Ya existe un registro con ese valor único (${target}).`);
  }
  if (e?.code === "P2025") return new TelosError("NOT_FOUND", "El registro no existe.");
  if (typeof e?.message === "string" && e.message.includes("inventory_on_hand_non_negative")) {
    return new TelosError("INSUFFICIENT_STOCK", "La operación dejaría el stock en negativo.");
  }
  console.error("[telos] error inesperado", err);
  return new TelosError("INTERNAL", "Error inesperado del servidor. Quedó registrado; intenta de nuevo o revisa los datos.");
}
