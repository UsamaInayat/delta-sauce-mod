import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE, gateTokenLooksValid } from "@/lib/auth/gate-token";

const PUBLIC_ADMIN = "/admin/login";

function isGatePublicPath(pathname: string) {
  if (pathname === "/raffles/unlock") return true;
  if (pathname.startsWith("/api/raffles/gate")) return true;
  return false;
}

function isProtectedRafflePath(pathname: string) {
  if (pathname === "/") return true;
  if (pathname === "/raffles") return true;
  if (pathname.startsWith("/raffles/") && !isGatePublicPath(pathname)) return true;
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

  if (!isProtectedRafflePath(pathname)) {
    return NextResponse.next();
  }

  if (isGatePublicPath(pathname)) {
    return NextResponse.next();
  }

  const gateToken = req.cookies.get(COOKIE)?.value;
  if (!gateTokenLooksValid(gateToken)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const unlock = new URL("/raffles/unlock", req.url);
    unlock.searchParams.set("next", pathname);
    return NextResponse.redirect(unlock);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/raffles",
    "/admin/:path*",
    "/raffles/:path*",
    "/api/raffles/:path*",
    "/api/ens/resolve",
  ],
};
