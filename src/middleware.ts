import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes
  const publicRoutes = ['/login', '/signup']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is authenticated and trying to access auth pages
  if (user && isPublicRoute) {
    // Check if profile is complete (handle errors gracefully)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()

    // If profile doesn't exist or is incomplete, redirect to onboarding
    if (profileError || !profile?.full_name) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // Redirect based on role
    if (profile.role === 'owner') {
      return NextResponse.redirect(new URL('/owner', request.url))
    } else {
      return NextResponse.redirect(new URL('/customer', request.url))
    }
  }

  // If user is authenticated and accessing protected routes
  if (user && !isPublicRoute) {
    // Allow access to onboarding even if profile query fails
    if (pathname === '/onboarding') {
      return response
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()

    // If profile doesn't exist or query failed, redirect to onboarding
    if (profileError || !profile) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // Redirect to onboarding if profile incomplete
    if (!profile.full_name) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // Role-based route protection
    if (profile.role === 'owner' && pathname.startsWith('/customer')) {
      return NextResponse.redirect(new URL('/owner', request.url))
    }

    if (profile.role === 'customer' && pathname.startsWith('/owner')) {
      return NextResponse.redirect(new URL('/customer', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
