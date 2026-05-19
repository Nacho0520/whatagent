// Twilio sends webhook as application/x-www-form-urlencoded POST
// No GET verification needed (unlike Meta) — Twilio uses signature validation only

import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookSignature, parseCustomerPhone } from '@/lib/whatsapp/client'
import { enqueueMessageProcessing } from '@/lib/upstash/qstash'
import type { TwilioWebhookPayload, WorkerPayload } from '@/types/whatsapp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Parse form-encoded body (Twilio sends application/x-www-form-urlencoded)
  const formData = await request.formData()
  const params: Record<string, string> = {}
  formData.forEach((value, key) => {
    params[key] = value.toString()
  })

  const payload = params as unknown as TwilioWebhookPayload

  // 2. Validate Twilio signature
  // TWILIO_WEBHOOK_AUTH_TOKEN is the master auth token used only for webhook validation
  const signature = request.headers.get('x-twilio-signature') ?? ''
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/whatsapp`

  const isValid = validateWebhookSignature(
    process.env.TWILIO_WEBHOOK_AUTH_TOKEN!,
    signature,
    url,
    params
  )

  if (!isValid) {
    console.error('[Webhook] Invalid Twilio signature')
    return new NextResponse('Forbidden', { status: 403 })
  }

  // 3. Ignore non-text messages (images, audio, etc.)
  if (!payload.Body || payload.Body.trim() === '') {
    return new NextResponse('', { status: 200 })
  }

  // 4. Build worker payload
  const workerPayload: WorkerPayload = {
    twilioMessageSid: payload.MessageSid,
    customerPhone: parseCustomerPhone(payload.From),
    customerName: payload.ProfileName || '',
    messageText: payload.Body.trim(),
    twilioWhatsappNumber: payload.To,  // Used to look up which business this is
    timestamp: new Date().toISOString(),
  }

  // 5. Enqueue to QStash — return 200 immediately
  await enqueueMessageProcessing(workerPayload)

  // 6. Twilio expects empty 200 response or TwiML — empty 200 is fine
  return new NextResponse('', { status: 200 })
}
