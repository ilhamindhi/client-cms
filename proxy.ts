import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";

const PUBLIC_ROUTES = ["/auth/login"];

function isPublicPath(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken && !isPublic) {
    const redirectTo = new URL("/auth/login", request.url);
    redirectTo.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectTo);
  }

  if (accessToken && pathname.startsWith("/auth/login")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
