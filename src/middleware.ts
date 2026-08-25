import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE, gateTokenLooksValid } from "@/lib/auth/gate-token";

const PUBLIC_ADMIN = "/admin/login";

function isProtectedRaffleApi(pathname: string) {
  if (pathname.startsWith("/api/raffles/") && !pathname.startsWith("/api/raffles/gate")) {
    return true;
  }
  if (pathname === "/api/ens/resolve") return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === PUBLIC_ADMIN) return NextResponse.next();

    const token = req.cookies.get("ds_admin_session")?.value;
    const looksValid = Boolean(token && token.split(".").length === 3);

    if (!looksValid) {
      const login = new URL(PUBLIC_ADMIN, req.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }

    return NextResponse.next();
  }

  if (isProtectedRaffleApi(pathname)) {
    const gateToken = req.cookies.get(COOKIE)?.value;
    if (!gateTokenLooksValid(gateToken)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/raffles/:path*", "/api/ens/resolve"],
};
