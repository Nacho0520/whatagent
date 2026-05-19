import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendTextMessage, isWithinCSW } from '@/lib/whatsapp/client'

export const dynamic = 'force-dynamic'

/**
 * Manual message send from dashboard. Only allowed inside CSW.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = (await req.json()) as { conversationId: string; text: string }
  if (!body.conversationId || !body.text?.trim()) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: conversation } = await service
    .from('conversations')
    .select('*, businesses(*)')
    .eq('id', body.conversationId)
    .maybeSingle()

  if (!conversation) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const business = conversation.businesses as {
    id: string
    owner_id: string
    twilio_account_sid: string | null
    twilio_auth_token: string | null
    twilio_whatsapp_number: string | null
  }
  if (business.owner_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  if (!isWithinCSW(conversation.last_customer_message_at)) {
    return NextResponse.json({ error: 'outside_csw' }, { status: 409 })
  }
  if (!business.twilio_account_sid || !business.twilio_auth_token || !business.twilio_whatsapp_number) {
    return NextResponse.json({ error: 'whatsapp_not_connected' }, { status: 409 })
  }

  const result = await sendTextMessage(
    business.twilio_account_sid,
    business.twilio_auth_token,
    business.twilio_whatsapp_number,
    conversation.customer_phone,
    body.text
  )

  if (!result.success) {
    return NextResponse.json({ error: 'send_failed', detail: result.error }, { status: 500 })
  }

  await service.from('messages').insert({
    conversation_id: conversation.id,
    business_id: business.id,
    role: 'assistant',
    content: body.text,
    twilio_message_sid: result.messageSid ?? null,
    was_deterministic: true,
  })

  await service
    .from('conversations')
    .update({ last_message_at: new Date().toISOString(), ai_messages: (conversation.ai_messages ?? 0) + 1, status: 'active' })
    .eq('id', conversation.id)

  return NextResponse.json({ ok: true })
}
