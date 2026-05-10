import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  if (pathname.startsWith("/api/auth") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // Sign-in page: redirect to app if already logged in
  if (pathname === "/sign-in") {
    if (isLoggedIn) return NextResponse.redirect(new URL("/simulate", req.url));
    return NextResponse.next();
  }

  // All routes are accessible without auth
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
