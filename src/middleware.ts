import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ADMIN = "/admin/login";

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
    !pathname.startsWith("/raffles/unlock")
  ) {
    const response = NextResponse.next();
    response.headers.set("x-raffle-next", `${pathname}${search}`);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/raffles/:path*"],
};
