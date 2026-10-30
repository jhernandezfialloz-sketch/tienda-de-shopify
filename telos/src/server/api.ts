import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { httpStatus, TelosError, toTelosError } from "@/lib/errors";
import { getSessionUser, SESSION_COOKIE, type SessionUser } from "@/server/auth/sessions";

/**
 * Envoltorio estándar de la API REST:
 *  - Autenticación por cookie de sesión (claves de API para integraciones: Fase 4).
 *  - Protección CSRF: en métodos que modifican datos, el Origin debe ser el propio sitio.
 *  - Respuestas uniformes: { data } o { error: { code, message } }.
 */
export function api<P = Record<string, string>>(handler: (ctx: { req: NextRequest; user: SessionUser; params: P }) => Promise<unknown>) {
  return async (req: NextRequest, { params }: { params: Promise<P> }) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        const origin = req.headers.get("origin");
        if (origin && new URL(origin).host !== req.headers.get("host")) {
          throw new TelosError("FORBIDDEN", "Origen no permitido.");
        }
      }
      const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
      if (!user) throw new TelosError("UNAUTHENTICATED", "Debes iniciar sesión.");
      const data = await handler({ req, user, params: await params });
      return NextResponse.json({ data }, { status: req.method === "POST" ? 201 : 200 });
    } catch (err) {
      const e = toTelosError(err);
      return NextResponse.json({ error: { code: e.code, message: e.message, details: e.details } }, { status: httpStatus[e.code] });
    }
  };
}

export async function body(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new TelosError("VALIDATION", "El cuerpo de la solicitud debe ser JSON válido.");
  }
}

export function query(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return { q: sp.get("q") ?? undefined, page: Number(sp.get("page")) || 1, pageSize: Number(sp.get("pageSize")) || undefined, sp };
}
