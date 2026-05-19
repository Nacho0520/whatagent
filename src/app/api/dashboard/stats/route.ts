import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id, ai_requests_this_month, monthly_conversation_limit, twilio_whatsapp_number, whatsapp_connected, billing_cycle_start, plan')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!business) return NextResponse.json({ error: 'no_business' }, { status: 404 })

  const since = business.billing_cycle_start

  const [conversationsCount, appointmentsCount, escalatedCount, statusBreakdown] = await Promise.all([
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('business_id', business.id).gte('created_at', since),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('business_id', business.id).gte('created_at', since),
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('business_id', business.id).eq('status', 'escalated'),
    supabase.from('conversations').select('status').eq('business_id', business.id),
  ])

  const breakdown = (statusBreakdown.data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    conversationsThisMonth: conversationsCount.count ?? 0,
    appointmentsThisMonth: appointmentsCount.count ?? 0,
    aiRequestsUsed: business.ai_requests_this_month,
    aiRequestsLimit: business.monthly_conversation_limit,
    escalatedCount: escalatedCount.count ?? 0,
    twilioWhatsappNumber: business.twilio_whatsapp_number ?? null,
    whatsappConnected: business.whatsapp_connected ?? false,
    plan: business.plan,
    statusBreakdown: breakdown,
  })
}
