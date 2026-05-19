import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PROTECTED_PREFIXES = ['/dashboard', '/onboarding']
const AUTH_PREFIXES = ['/login', '/register']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthPage = AUTH_PREFIXES.some((p) => pathname.startsWith(p))

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthPage && user) {
    const dashUrl = request.nextUrl.clone()
    dashUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static, _next/image, favicon, public assets, api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)',
  ],
}
