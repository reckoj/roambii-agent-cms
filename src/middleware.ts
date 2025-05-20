import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Check cookies for authentication
  const userIdCookie = request.cookies.get("lastUserId");
  const sessionCookie = request.cookies.get("session");
  const hasSubscription =
    request.cookies.get("hasSubscription")?.value === "true";

  const isAuthenticated = !!userIdCookie || !!sessionCookie;

  // Define route groups
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/forgot-password") ||
    request.nextUrl.pathname.startsWith("/reset-password");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  const isSubscribePage = request.nextUrl.pathname.startsWith("/subscribe");
  const isDashboardPage =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/packages") ||
    request.nextUrl.pathname.startsWith("/bookings") ||
    request.nextUrl.pathname.startsWith("/clients") ||
    request.nextUrl.pathname.startsWith("/itineraries");
  const isPublicRoute =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/static");

  // Debug logging - only in development
  if (process.env.NODE_ENV !== "production") {
    console.log("Middleware: Path:", request.nextUrl.pathname);
    console.log("Middleware: Auth state:", {
      isAuthenticated,
      hasSubscription,
      isAuthPage,
      isSubscribePage,
      isDashboardPage,
    });
  }

  // Allow public routes and API routes without checks
  if (isPublicRoute || isApiRoute) {
    return NextResponse.next();
  }

  // Special case for subscription success page - always allow if authenticated
  if (
    request.nextUrl.pathname.startsWith("/subscribe/success") &&
    isAuthenticated
  ) {
    return NextResponse.next();
  }

  // If user is authenticated and tries to access an auth page, redirect to dashboard
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // For dashboard routes, check if user is authenticated
  if (isDashboardPage && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect unauthenticated users to login
  if (!isAuthPage && !isSubscribePage && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If authenticated user without subscription tries to access dashboard, redirect to subscribe
  if (
    isDashboardPage &&
    isAuthenticated &&
    !hasSubscription &&
    !request.nextUrl.pathname.startsWith("/subscribe")
  ) {
    return NextResponse.redirect(new URL("/subscribe", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
