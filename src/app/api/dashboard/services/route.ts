import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!business) return NextResponse.json({ error: 'no_business' }, { status: 404 })

  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .order('sort_order', { ascending: true })

  return NextResponse.json({ services: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!business) return NextResponse.json({ error: 'no_business' }, { status: 404 })

  const body = (await req.json()) as {
    name: string
    description?: string
    price_cents?: number
    duration_minutes?: number
    is_active?: boolean
  }
  if (!body.name) return NextResponse.json({ error: 'name_required' }, { status: 400 })

  const { data, error } = await supabase
    .from('services')
    .insert({
      business_id: business.id,
      name: body.name,
      description: body.description ?? null,
      price_cents: body.price_cents ?? null,
      duration_minutes: body.duration_minutes ?? null,
      is_active: body.is_active ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ service: data })
}
