import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Handle API routes - just let them pass through
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.next();
    }

    // All other routes are handled by NextAuth.js middleware automatically
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Public routes that don't require authentication
        const publicRoutes = [
          '/',
          '/platform',
          '/pricing', 
          '/solutions',
          '/enterprise',
          '/developers',
          '/resources',
          '/auth/signin',
          '/auth/error'
        ];
        
        const { pathname } = req.nextUrl;
        
        // Allow public routes
        if (publicRoutes.includes(pathname)) {
          return true;
        }
        
        // Allow API routes to handle their own auth
        if (pathname.startsWith('/api/')) {
          return true;
        }
        
        // Require authentication for all other routes
        return !!token;
      },
    },
  }
);
  
  // If the route is not public and the user is not authenticated, redirect to sign-in
  if (!isPublicRoute(req) && !authData.userId) {
    return authData.redirectToSignIn();
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (authData.userId && (req.nextUrl.pathname === '/sign-in' || req.nextUrl.pathname === '/sign-up')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Redirect root path to dashboard if signed in
  if (authData.userId && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
