import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCustomerPortalSession } from '@/lib/stripe/plans'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('stripe_customer_id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!business?.stripe_customer_id) {
    return NextResponse.json({ error: 'no_customer' }, { status: 404 })
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
  const session = await createCustomerPortalSession(
    business.stripe_customer_id,
    `${origin}/dashboard/billing`
  )

  return NextResponse.json({ url: session.url })
}
