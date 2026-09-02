import { NextResponse, type NextRequest } from "next/server";

export default async function authMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // We fetch the session from Better Auth API
  let session = null;
  try {
    const headers = new Headers(request.headers);
    const baseURL = process.env.BETTER_AUTH_URL || request.nextUrl.origin;
    const fetchUrl = new URL("/api/auth/get-session", baseURL);
    const response = await fetch(fetchUrl, {
      headers: headers,
    });
    if (response.ok) {
      session = await response.json();
    }
  } catch (error) {
    console.error("Failed to fetch session in middleware", error);
  }

  const user = session?.user;

  // Protect dashboard routes
  if (!user && pathname.startsWith("/dashboard")) {
    const role = pathname.split("/")[2];
    if (role) {
      return NextResponse.redirect(new URL(`/login/${role}`, request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect authenticated users from /login and protect role-specific routes
  if (user) {
    const role = user.role;
    
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
