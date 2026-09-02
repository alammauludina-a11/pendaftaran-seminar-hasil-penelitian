import { NextResponse, type NextRequest } from "next/server";

export default async function authMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const hasSession = request.cookies.has("better-auth.session_token") || request.cookies.has("__Secure-better-auth.session_token");
  const role = request.cookies.get("user-role")?.value;

  // Protect dashboard routes
  if (!hasSession && pathname.startsWith("/dashboard")) {
    const pathRole = pathname.split("/")[2];
    if (pathRole) {
      return NextResponse.redirect(new URL(`/login/${pathRole}`, request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect authenticated users from /login and protect role-specific routes
  if (hasSession && role) {
    if (pathname.startsWith("/dashboard/mahasiswa") && role !== "mahasiswa") {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
    }
    if (pathname.startsWith("/dashboard/dosen") && role !== "dosen") {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
    }
    if (pathname.startsWith("/dashboard/admin") && role !== "admin") {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
    }
    
    if (pathname === "/login" || pathname === "/") {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/"],
};
