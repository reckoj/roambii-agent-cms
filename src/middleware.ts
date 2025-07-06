import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Check cookies for authentication
  const userIdCookie = request.cookies.get("lastUserId");
  const sessionCookie = request.cookies.get("session");
  const hasSubscriptionCookie = request.cookies.get("hasSubscription")?.value === "true";

  // Enhanced debug logging
  console.log("=== Middleware Request ===");
  console.log("Path:", request.nextUrl.pathname);
  console.log("User ID from cookie:", userIdCookie?.value);
  console.log("Session exists:", !!sessionCookie);
  console.log("Has Subscription Cookie:", hasSubscriptionCookie);

  // Check authentication - either userId or session is sufficient
  const isAuthenticated = !!userIdCookie || !!sessionCookie;
  
  console.log("=== Auth State ===");
  console.log("Is Authenticated:", isAuthenticated);
  console.log("Auth Details:", {
    hasUserId: !!userIdCookie,
    hasSession: !!sessionCookie,
    userId: userIdCookie?.value
  });

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

  console.log("=== Route State ===");
  console.log("Is Auth Page:", isAuthPage);
  console.log("Is Subscribe Page:", isSubscribePage);
  console.log("Is Dashboard Page:", isDashboardPage);

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
    console.log("❌ Unauthenticated access attempt to dashboard");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect unauthenticated users to login
  if (!isAuthPage && !isSubscribePage && !isAuthenticated) {
    console.log("❌ Unauthenticated access attempt to protected route");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // For authenticated users accessing dashboard, check subscription status
  if (isDashboardPage && isAuthenticated && !request.nextUrl.pathname.startsWith("/subscribe")) {
    const userId = userIdCookie?.value;
    
    if (!userId) {
      console.log("❌ No user ID found for authenticated user");
      return NextResponse.redirect(new URL("/login", request.url));
    }
    
    // Check subscription status from cookie only
    // If no subscription cookie, redirect to subscribe page
    if (!hasSubscriptionCookie) {
      console.log("❌ No active subscription cookie found, redirecting to subscribe");
      return NextResponse.redirect(new URL("/subscribe", request.url));
    } else {
      console.log("✅ Valid subscription cookie found");
    }
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
