import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export async function middleware(request: NextRequest) {
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

  // For dashboard routes, check if user is an agent
  if (isDashboardPage && isAuthenticated) {
    const userId = userIdCookie?.value;
    if (userId) {
      try {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists() || !userDoc.data().isAgent) {
          // If user is not an agent, redirect to login
          return NextResponse.redirect(new URL('/login', request.url));
        }
      } catch (error) {
        console.error('Error checking agent status:', error);
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
  }

  // Redirect unauthenticated users to login
  if (!isAuthPage && !isSubscribePage && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
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