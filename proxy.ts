import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session if expired - this is important for maintaining auth state
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;
  const isOnAuthPage =
    request.nextUrl.pathname.startsWith('/signin') || request.nextUrl.pathname.startsWith('/signup');
  const isOnOnboarding = request.nextUrl.pathname.startsWith('/onboarding');
  const isOnDashboard = request.nextUrl.pathname.startsWith('/dashboard');
  const isOnSettings = request.nextUrl.pathname.startsWith('/settings');

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isOnAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Protect dashboard, settings, and onboarding routes
  if (!isLoggedIn && (isOnDashboard || isOnSettings || isOnOnboarding)) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
