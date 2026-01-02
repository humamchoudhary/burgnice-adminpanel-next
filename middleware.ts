// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token =
    request.cookies.get("adminToken")?.value ||
    (typeof window !== "undefined" ? localStorage.getItem("adminToken") : null);

  const isLoginPage = request.nextUrl.pathname === "/login";
  const isHomePage = request.nextUrl.pathname === "/";

  // If user is logged in and tries to access login page, redirect to home
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If user is not logged in and tries to access home page, redirect to login
  if (!token && isHomePage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login"],
};
