import { NextRequest, NextResponse } from 'next/server'
import { qstashReceiver } from '@/lib/upstash/qstash'
import { createServiceClient } from '@/lib/supabase/service'
import { sendTextMessage } from '@/lib/whatsapp/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Payload {
  jobType: 'reminder_24h' | 'reminder_2h'
  appointmentId: string
  businessId: string
}

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

  const payload = JSON.parse(body) as Payload
  const supabase = createServiceClient()

  const { data: appointment } = await supabase
    .from('appointments')
    .select('*, businesses(twilio_account_sid, twilio_auth_token, twilio_whatsapp_number, name)')
    .eq('id', payload.appointmentId)
    .maybeSingle()

  if (!appointment) return NextResponse.json({ ok: true, skipped: 'not_found' })
  if (appointment.status !== 'confirmed') return NextResponse.json({ ok: true, skipped: 'not_confirmed' })

  const business = appointment.businesses as {
    twilio_account_sid: string | null
    twilio_auth_token: string | null
    twilio_whatsapp_number: string | null
    name: string
  }
  if (!business?.twilio_account_sid || !business.twilio_auth_token || !business.twilio_whatsapp_number) {
    return NextResponse.json({ ok: true, skipped: 'no_whatsapp' })
  }

  const when = new Date(appointment.scheduled_at).toLocaleString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Madrid',
  })

  const text = payload.jobType === 'reminder_24h'
    ? `Hola${appointment.customer_name ? ` ${appointment.customer_name}` : ''}, te recordamos tu cita en ${business.name} mañana, ${when}. ¡Te esperamos!`
    : `Hola${appointment.customer_name ? ` ${appointment.customer_name}` : ''}, tu cita en ${business.name} es en 2 horas (${when}). ¡Hasta pronto!`

  const result = await sendTextMessage(
    business.twilio_account_sid,
    business.twilio_auth_token,
    business.twilio_whatsapp_number,
    appointment.customer_phone,
    text
  )

  const updateField = payload.jobType === 'reminder_24h' ? 'reminder_24h_sent' : 'reminder_2h_sent'
  await supabase.from('appointments').update({ [updateField]: true }).eq('id', payload.appointmentId)

  await supabase.from('scheduled_jobs').insert({
    business_id: payload.businessId,
    job_type: payload.jobType,
    status: result.success ? 'sent' : 'failed',
    payload: { appointmentId: payload.appointmentId },
    execute_at: new Date().toISOString(),
    executed_at: new Date().toISOString(),
    error_message: result.success ? null : result.error ?? null,
  })

  return NextResponse.json({ ok: true })
}
