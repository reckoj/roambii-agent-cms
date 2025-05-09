import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check cookies and headers for authentication
  const userIdCookie = request.cookies.get('lastUserId');
  const sessionCookie = request.cookies.get('session');
  const hasSubscription = request.cookies.get('hasSubscription')?.value === 'true';
  
  const isAuthenticated = !!userIdCookie || !!sessionCookie;
  
  // Define route groups
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                    request.nextUrl.pathname.startsWith('/forgot-password');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isSubscribePage = request.nextUrl.pathname.startsWith('/subscribe');
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard');
  const isPublicRoute = request.nextUrl.pathname === '/' || 
                       request.nextUrl.pathname.startsWith('/_next') ||
                       request.nextUrl.pathname.startsWith('/static');

  // Debug logging
  console.log('Middleware: Path:', request.nextUrl.pathname);
  console.log('Middleware: Auth state:', { 
    isAuthenticated, 
    hasSubscription,
    isAuthPage,
    isSubscribePage,
    isDashboardPage 
  });

  // Allow public routes and API routes without checks
  if (isPublicRoute || isApiRoute) {
    return NextResponse.next();
  }

  // Special case for subscription success page - always allow if authenticated
  if (request.nextUrl.pathname.startsWith('/subscribe/success') && isAuthenticated) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!isAuthPage && !isSubscribePage && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage && isAuthenticated) {
    // If they have a subscription or we're coming from subscribe success, send to dashboard
    if (hasSubscription || request.headers.get('referer')?.includes('/subscribe/success')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/subscribe', request.url));
    }
  }

  // Check if authenticated users have a subscription for dashboard and protected routes
  if (isAuthenticated && isDashboardPage && !hasSubscription) {
    // Special case: check if user just came from subscription success page
    const referer = request.headers.get('referer');
    if (referer && referer.includes('/subscribe/success')) {
      // Allow access if coming from success page, they probably just subscribed
      return NextResponse.next();
    }
    
    // Otherwise redirect to subscribe page
    return NextResponse.redirect(new URL('/subscribe', request.url));
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
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 