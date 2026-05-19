import { Client, Receiver } from '@upstash/qstash'

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
})

export const qstashReceiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
})

export interface ProcessMessagePayload {
  twilioMessageSid: string
  customerPhone: string
  customerName: string
  messageText: string
  twilioWhatsappNumber: string
  timestamp: string
}

export async function enqueueMessageProcessing(payload: ProcessMessagePayload) {
  const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/worker/process`

  return qstash.publishJSON({
    url: workerUrl,
    body: payload,
    retries: 3,
    delay: 0,
  })
}

export interface ScheduledJobPayload {
  jobType: string
  appointmentId?: string
  conversationId?: string
  businessId?: string
  [key: string]: unknown
}

export async function scheduleJob(
  payload: ScheduledJobPayload,
  delaySeconds: number,
  workerPath: string
) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}${workerPath}`

  return qstash.publishJSON({
    url,
    body: payload,
    delay: delaySeconds,
    retries: 2,
  })
}

export async function cancelJob(messageId: string) {
  try {
    await qstash.messages.delete(messageId)
    return true
  } catch (error) {
    console.error('[QStash] Failed to cancel job', { messageId, error })
    return false
  }
}
