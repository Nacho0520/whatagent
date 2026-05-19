import { NextRequest, NextResponse } from 'next/server'
import { qstashReceiver } from '@/lib/upstash/qstash'
import { createServiceClient } from '@/lib/supabase/service'
import { sendTextMessage } from '@/lib/whatsapp/client'
import { PLANS } from '@/lib/stripe/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('upstash-signature')
  if (process.env.QSTASH_CURRENT_SIGNING_KEY) {
    try {
      await qstashReceiver.verify({ signature: signature ?? '', body })
    } catch {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  const { conversationId } = JSON.parse(body) as { conversationId: string }
  const supabase = createServiceClient()

  const { data: conversation } = await supabase
    .from('conversations')
    .select('*, businesses(twilio_account_sid, twilio_auth_token, twilio_whatsapp_number, name, plan)')
    .eq('id', conversationId)
    .maybeSingle()
  if (!conversation) return NextResponse.json({ ok: true, skipped: 'not_found' })

  const business = conversation.businesses as {
    twilio_account_sid: string | null
    twilio_auth_token: string | null
    twilio_whatsapp_number: string | null
    name: string
    plan: keyof typeof PLANS
  }
  if (!business || !PLANS[business.plan]?.hasFollowUps) {
    return NextResponse.json({ ok: true, skipped: 'plan_not_eligible' })
  }
  if (conversation.follow_up_sent) {
    return NextResponse.json({ ok: true, skipped: 'already_sent' })
  }

  if (!business.twilio_account_sid || !business.twilio_auth_token || !business.twilio_whatsapp_number) {
    return NextResponse.json({ ok: true, skipped: 'no_whatsapp' })
  }

  const text = `Hola, somos ${business.name}. Queremos saber si pudimos ayudarte. ¿Hay algo más en lo que podamos asistirte?`

  const result = await sendTextMessage(
    business.twilio_account_sid,
    business.twilio_auth_token,
    business.twilio_whatsapp_number,
    conversation.customer_phone,
    text
  )

  await Promise.all([
    supabase
      .from('conversations')
      .update({ follow_up_sent: true })
      .eq('id', conversationId),
    supabase.from('scheduled_jobs').insert({
      business_id: conversation.business_id,
      job_type: 'follow_up',
      status: result.success ? 'sent' : 'failed',
      payload: { conversationId },
      execute_at: new Date().toISOString(),
      executed_at: new Date().toISOString(),
      error_message: result.success ? null : result.error ?? null,
    }),
  ])

  return NextResponse.json({ ok: true })
}
