import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ business: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const allowed = new Set([
    'name', 'industry', 'city', 'phone', 'email', 'website',
    'agent_name', 'agent_persona', 'business_context', 'agent_tone',
    'escalation_phone', 'escalation_email',
    'onboarding_step', 'onboarding_completed',
    'twilio_account_sid', 'twilio_auth_token', 'twilio_whatsapp_number',
  ])
  const body = (await req.json()) as Record<string, unknown>
  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (allowed.has(k)) update[k] = v
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('businesses')
    .update(update)
    .eq('owner_id', user.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ business: data })
}

export async function POST(req: NextRequest) {
  // Create business after signup
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ business: existing })
  }

  const body = (await req.json().catch(() => ({}))) as { name?: string }
  const businessName = body.name ?? (user.user_metadata?.business_name as string | undefined) ?? 'Mi Negocio'

  const { data, error } = await supabase
    .from('businesses')
    .insert({
      owner_id: user.id,
      name: businessName,
      email: user.email,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ business: data })
}
