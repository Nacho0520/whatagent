import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeAuthCode, getAuthUrl } from '@/lib/calendar/client'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET — initiate OAuth (returns URL or redirects)
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')

  // OAuth callback (Google redirects back here)
  if (code) {
    const stateCookie = (await cookies()).get('google_oauth_state')?.value
    if (!stateCookie || !stateParam || stateCookie !== stateParam) {
      console.error('[OAuth] CSRF state mismatch', { provided: stateParam, stored: stateCookie })
      return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 403 })
    }

    try {
      const tokens = await exchangeAuthCode(code)
      const calendarId = 'primary'

      await supabase
        .from('businesses')
        .update({
          google_access_token: tokens.accessToken,
          google_refresh_token: tokens.refreshToken,
          google_token_expiry: tokens.expiry,
          google_calendar_id: calendarId,
          calendar_connected: true,
        })
        .eq('owner_id', user.id)

      ;(await cookies()).delete('google_oauth_state')
      return NextResponse.redirect(new URL('/onboarding/calendar?connected=1', req.url))
    } catch (error) {
      console.error('[OAuth] Calendar exchange failed', { error })
      ;(await cookies()).delete('google_oauth_state')
      return NextResponse.redirect(new URL('/onboarding/calendar?error=oauth_failed', req.url))
    }
  }

  // Generate auth URL and redirect with CSRF state
  const initiate = searchParams.get('initiate')
  const state = crypto.randomUUID()
  const authUrl = getAuthUrl(state)

  if (initiate) {
    const response = NextResponse.redirect(authUrl)
    response.cookies.set('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60,
    })
    return response
  }

  // Return URL as JSON if no redirect requested
  const response = NextResponse.json({ url: authUrl, state })
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60,
  })
  return response
}
