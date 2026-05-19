import { createClient } from '@/lib/supabase/server'
import type { Business } from '@/types/database'

/**
 * Returns the authenticated user's business (first one they own) or null.
 * Used in dashboard / onboarding API routes.
 */
export async function getCurrentBusiness(): Promise<{
  business: Business | null
  userId: string | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { business: null, userId: null }

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[Auth] getCurrentBusiness failed', { error })
    return { business: null, userId: user.id }
  }
  return { business: data as Business | null, userId: user.id }
}

export async function requireBusiness(): Promise<{ business: Business; userId: string }> {
  const { business, userId } = await getCurrentBusiness()
  if (!business || !userId) {
    throw new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }
  return { business, userId }
}
