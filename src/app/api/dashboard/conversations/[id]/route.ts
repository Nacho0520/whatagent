import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const [{ data: conversation }, { data: messages }] = await Promise.all([
    supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('messages')
      .select('id, role, content, created_at, intent_classified, was_deterministic, error_message')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!conversation) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ conversation, messages: messages ?? [] })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const [supabase, body] = await Promise.all([
    createClient(),
    req.json() as Promise<{ status?: string }>,
  ])

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (!body.status || !['active', 'resolved', 'escalated', 'waiting_human'].includes(body.status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
  }

  const { error } = await supabase
    .from('conversations')
    .update({ status: body.status })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
