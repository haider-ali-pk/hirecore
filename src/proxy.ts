import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { homeForRole, roleForPath } from "@/lib/roles";

/*
  Optimistic redirects only. Do not treat this as the authorisation layer:
  every portal layout and server action must verify the session itself.
*/

export const proxy = auth((req) => {
  const { pathname, search } = req.nextUrl;
  const portalRole = roleForPath(pathname);

  if (portalRole === null) return NextResponse.next();

  const session = req.auth;

  if (!session?.user) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // Signed in, but this portal belongs to a different role.
  if (session.user.role !== portalRole) {
    return NextResponse.redirect(new URL(homeForRole(session.user.role), req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/super-admin/:path*",
    "/company-admin/:path*",
    "/recruiter/:path*",
    "/hiring-manager/:path*",
    "/employee/:path*",
    "/candidate/:path*",
  ],
};