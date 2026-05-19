import twilio from 'twilio'

/**
 * Send a plain text WhatsApp message via Twilio.
 * Each business uses their own Twilio account SID + auth token stored in DB.
 */
export async function sendTextMessage(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    const client = twilio(accountSid, authToken)
    const message = await client.messages.create({
      from,
      to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
      body,
    })
    return { success: true, messageSid: message.sid }
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Twilio] sendTextMessage failed', { error, to })
    return { success: false, error }
  }
}

/**
 * Validate Twilio webhook signature.
 * Twilio signs every webhook POST with X-Twilio-Signature header using HMAC-SHA1.
 */
export function validateWebhookSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  try {
    return twilio.validateRequest(authToken, signature, url, params)
  } catch {
    return false
  }
}

/**
 * Parse customer phone from Twilio 'From' field.
 * Input: 'whatsapp:+34612345678'
 * Output: '+34612345678'
 */
export function parseCustomerPhone(twilioFrom: string): string {
  return twilioFrom.replace('whatsapp:', '')
}

/**
 * Check if we are within the 24-hour customer service window.
 * Within the window: free-form messages allowed.
 * Outside: must use approved templates.
 */
export function isWithinCSW(lastCustomerMessageAt: Date | string | null): boolean {
  if (!lastCustomerMessageAt) return false
  const date = typeof lastCustomerMessageAt === 'string' ? new Date(lastCustomerMessageAt) : lastCustomerMessageAt
  const hoursSince = (Date.now() - date.getTime()) / 1000 / 3600
  return hoursSince < 24
}
