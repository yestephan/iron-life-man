import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnAuthPage = req.nextUrl.pathname.startsWith('/signin') ||
                       req.nextUrl.pathname.startsWith('/signup');
  const isOnOnboarding = req.nextUrl.pathname.startsWith('/onboarding');
  const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard');
  const isOnSettings = req.nextUrl.pathname.startsWith('/settings');

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isOnAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Protect dashboard, settings, and onboarding routes
  if (!isLoggedIn && (isOnDashboard || isOnSettings || isOnOnboarding)) {
    return NextResponse.redirect(new URL('/signin', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
