import { NextResponse, type NextRequest } from "next/server";

// Filtro rápido en el borde: sin cookie de sesión → login. La validación real de la
// sesión y de los permisos ocurre en el servidor (requireUser / assertCan).
const PUBLIC_ADMIN = ["/admin/login", "/admin/recuperar", "/admin/restablecer", "/admin/primer-uso"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_ADMIN.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (!req.cookies.get("telos_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
