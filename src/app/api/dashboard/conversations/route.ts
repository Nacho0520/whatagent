import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!business) return NextResponse.json({ error: 'no_business' }, { status: 404 })

  let query = supabase
    .from('conversations')
    .select('id, customer_phone, customer_name, status, last_message_at, total_messages, ai_messages', { count: 'exact' })
    .eq('business_id', business.id)
    .order('last_message_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, count } = await query

  return NextResponse.json({ conversations: data ?? [], total: count ?? 0 })
}
