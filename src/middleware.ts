import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE, gateTokenLooksValid } from "@/lib/auth/gate-token";

const PUBLIC_ADMIN = "/admin/login";

function raffleUnlockPath(pathname: string, search: string) {
  const unlock = new URL("/raffles/unlock", "http://local");
  unlock.searchParams.set("next", `${pathname}${search}`);
  return `${unlock.pathname}${unlock.search}`;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

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

  if (
    pathname.startsWith("/raffles") &&
    pathname !== "/raffles/unlock" &&
    !pathname.startsWith("/api/")
  ) {
    try {
      const gateToken = req.cookies.get(COOKIE)?.value;
      if (!gateTokenLooksValid(gateToken)) {
        return NextResponse.redirect(
          new URL(raffleUnlockPath(pathname, search), req.url),
        );
      }
    } catch {
      return NextResponse.redirect(
        new URL(raffleUnlockPath(pathname, search), req.url),
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/raffles/:path*",
    "/api/raffles/:path*",
    "/api/ens/resolve",
  ],
};
