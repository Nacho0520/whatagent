import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!business) return NextResponse.json({ error: 'no_business' }, { status: 404 })

  let query = supabase
    .from('appointments')
    .select('*, services(name)')
    .eq('business_id', business.id)
    .order('scheduled_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status)
  const { data } = await query

  return NextResponse.json({ appointments: data ?? [] })
}
