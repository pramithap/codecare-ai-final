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

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
