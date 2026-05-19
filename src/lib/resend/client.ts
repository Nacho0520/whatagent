import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
export const resend = apiKey ? new Resend(apiKey) : null

const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

export async function sendEmail(args: {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}) {
  if (!resend) {
    console.warn('[Resend] RESEND_API_KEY not set, skipping email send', { to: args.to })
    return { skipped: true as const }
  }
  try {
    const result = await resend.emails.send({
      from: FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo,
    })
    return result
  } catch (error) {
    console.error('[Resend] sendEmail failed', { error })
    return { error: 'send_failed' as const }
  }
}

export function escalationEmailHtml(args: {
  businessName: string
  customerPhone: string
  customerName?: string | null
  lastMessages: Array<{ role: string; content: string }>
}) {
  const lines = args.lastMessages
    .slice(-8)
    .map((m) => `<p><strong>${m.role === 'user' ? 'Cliente' : 'Agente'}:</strong> ${escapeHtml(m.content)}</p>`)
    .join('')
  return `<div style="font-family:sans-serif">
    <h2>Conversación escalada — ${escapeHtml(args.businessName)}</h2>
    <p><strong>Cliente:</strong> ${escapeHtml(args.customerName ?? 'sin nombre')} (${escapeHtml(args.customerPhone)})</p>
    <hr/>
    ${lines}
    <hr/>
    <p>Accede al panel para responder o cerrar la conversación.</p>
  </div>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
