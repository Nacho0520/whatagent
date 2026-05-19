import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession, PLANS } from '@/lib/stripe/plans'
import type { BusinessPlan } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = (await req.json()) as { plan?: BusinessPlan }
  const planKey = body.plan
  if (!planKey || !(planKey in PLANS) || planKey === 'trial') {
    return NextResponse.json({ error: 'invalid_plan' }, { status: 400 })
  }
  const descriptor = PLANS[planKey]
  if (!descriptor.stripePriceId) {
    return NextResponse.json({ error: 'price_not_configured' }, { status: 500 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id, stripe_customer_id, email')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!business) return NextResponse.json({ error: 'no_business' }, { status: 404 })

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin

  const session = await createCheckoutSession({
    businessId: business.id,
    customerEmail: business.email ?? user.email ?? '',
    customerId: business.stripe_customer_id ?? undefined,
    priceId: descriptor.stripePriceId,
    successUrl: `${origin}/dashboard/billing?status=success`,
    cancelUrl: `${origin}/onboarding/activate?status=cancel`,
  })

  return NextResponse.json({ url: session.url })
}
