import { NextRequest, NextResponse } from 'next/server'
import { qstashReceiver, scheduleJob } from '@/lib/upstash/qstash'
import { createServiceClient } from '@/lib/supabase/service'
import { classifyIntent } from '@/lib/ai/classifier'
import { buildSystemPrompt } from '@/lib/ai/prompt-builder'
import { generateResponse } from '@/lib/ai/generator'
import { calculateAnthropicCost } from '@/lib/ai/cost-calculator'
import {
  clearConversationState,
  getConversationState,
  setConversationState,
  isDuplicateMessage,
  incrementDailyMessageCount,
} from '@/lib/upstash/redis'
import { sendTextMessage } from '@/lib/whatsapp/client'
import {
  createAppointment as gcalCreateAppointment,
  getAvailableSlots,
} from '@/lib/calendar/client'
import { sendEmail, escalationEmailHtml } from '@/lib/resend/client'
import type { Business, Service, Conversation, Message, PendingSlot } from '@/types/database'
import type { ClassificationResult, ConversationContext } from '@/types/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

interface ProcessPayload {
  twilioMessageSid: string
  customerPhone: string
  customerName: string
  messageText: string
  twilioWhatsappNumber: string
  timestamp: string
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  const rawBody = await req.text()
  const signature = req.headers.get('upstash-signature')

  // Verify QStash signature unless explicitly bypassed (local dev w/o tunnel)
  if (process.env.NODE_ENV === 'production' || process.env.QSTASH_CURRENT_SIGNING_KEY) {
    try {
      await qstashReceiver.verify({
        signature: signature ?? '',
        body: rawBody,
      })
    } catch (error) {
      console.error('[Worker] QStash signature invalid', { error })
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  let payload: ProcessPayload
  try {
    payload = JSON.parse(rawBody) as ProcessPayload
  } catch {
    return new NextResponse('Bad request', { status: 400 })
  }

  const { twilioMessageSid, customerPhone, customerName, messageText, twilioWhatsappNumber } = payload

  // Redis-based dedup (cheap, fast)
  if (await isDuplicateMessage(twilioMessageSid)) {
    console.log('[Worker] Duplicate message, skipping', { twilioMessageSid })
    return NextResponse.json({ ok: true, deduped: true })
  }

  const supabase = createServiceClient()

  // 1. Find business by Twilio WhatsApp number
  const { data: businessRow, error: businessErr } = await supabase
    .from('businesses')
    .select('*')
    .eq('twilio_whatsapp_number', twilioWhatsappNumber)
    .eq('is_active', true)
    .maybeSingle()

  if (businessErr || !businessRow) {
    console.error('[Worker] No business for twilio_whatsapp_number', { twilioWhatsappNumber, businessErr })
    return NextResponse.json({ ok: true }) // don't retry — bad data
  }
  const business = businessRow as Business

  // 2. Subscription / limit checks
  if (business.plan_status === 'canceled') {
    await sendTextMessage(
      business.twilio_account_sid ?? '',
      business.twilio_auth_token ?? '',
      business.twilio_whatsapp_number ?? '',
      customerPhone,
      'En este momento este número no está activo. Por favor, contacta con el negocio directamente.'
    )
    return NextResponse.json({ ok: true })
  }

  const limitReached =
    business.plan !== 'agency' &&
    business.ai_requests_this_month >= business.monthly_conversation_limit

  if (limitReached) {
    await sendTextMessage(
      business.twilio_account_sid ?? '',
      business.twilio_auth_token ?? '',
      business.twilio_whatsapp_number ?? '',
      customerPhone,
      'Estamos experimentando un volumen alto en este momento. Te contactaremos lo antes posible.'
    )
    return NextResponse.json({ ok: true })
  }

  // 3. DB-level dedup
  const { data: existing } = await supabase
    .from('messages')
    .select('id')
    .eq('twilio_message_sid', twilioMessageSid)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ ok: true, deduped: true })
  }

  // 4. Get or create conversation
  const { data: convRow } = await supabase
    .from('conversations')
    .upsert(
      {
        business_id: business.id,
        customer_phone: customerPhone,
        customer_name: customerName ?? null,
        last_customer_message_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      },
      { onConflict: 'business_id,customer_phone' }
    )
    .select('*')
    .single()

  const conversation = convRow as Conversation
  if (!conversation) {
    console.error('[Worker] Failed to upsert conversation', { businessId: business.id, customerPhone })
    return new NextResponse('Internal error', { status: 500 })
  }

  // 5+6. Save incoming message + update conversation counters (independent)
  await Promise.all([
    supabase.from('messages').insert({
      conversation_id: conversation.id,
      business_id: business.id,
      role: 'user',
      content: messageText,
      twilio_message_sid: twilioMessageSid,
    }),
    supabase
      .from('conversations')
      .update({
        total_messages: (conversation.total_messages ?? 0) + 1,
        last_customer_message_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        status: conversation.status === 'resolved' ? 'active' : conversation.status,
      })
      .eq('id', conversation.id),
  ])

  // 7. Recent message history, Redis state, and services (all independent — parallelize)
  const [
    { data: recentMessagesRaw },
    cacheState,
    { data: servicesRaw },
  ] = await Promise.all([
    supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(8),
    getConversationState(business.id, customerPhone),
    supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])
  const recentMessages: ConversationContext = (recentMessagesRaw ?? [])
    .reverse()
    .reduce<ConversationContext>((acc, m) => {
      if (m.role === 'user' || m.role === 'assistant') {
        acc.push({ role: m.role as 'user' | 'assistant', content: m.content })
      }
      return acc
    }, [])
  const services = (servicesRaw ?? []) as Service[]

  // 10. Classify
  const classification = await classifyIntent(messageText, {
    recentMessages,
    hasPendingSlots: !!cacheState?.pendingSlots?.length,
    services,
  })

  console.log('[Worker] Classification', {
    businessId: business.id,
    intent: classification.intent,
    confidence: classification.confidence,
  })

  // 11. Route by intent
  const responseStart = Date.now()
  let replyText = ''
  let wasDeterministic = false
  let modelUsed: string | undefined
  let inputTokens = (classification.inputTokens ?? 0)
  let outputTokens = (classification.outputTokens ?? 0)

  switch (classification.intent) {
    case 'APPOINTMENT_SELECTION': {
      const slot = cacheState?.pendingSlots?.find((s) => s.index === classification.selectedSlotIndex)
      const service =
        services.find((s) => s.id === cacheState?.pendingServiceId) ?? services[0]
      if (!slot || !service) {
        replyText =
          'Lo siento, no encontré las opciones que te ofrecimos. ¿Puedes decirme de nuevo qué cita necesitas?'
        wasDeterministic = true
        break
      }
      if (!business.calendar_connected || !business.google_calendar_id || !business.google_access_token || !business.google_refresh_token) {
        replyText =
          '¡Perfecto! Hemos anotado tu preferencia. Un miembro del equipo confirmará la cita en breve.'
        wasDeterministic = true
        break
      }

      const result = await gcalCreateAppointment(
        {
          accessToken: business.google_access_token,
          refreshToken: business.google_refresh_token,
          expiry: business.google_token_expiry,
        },
        business.google_calendar_id,
        slot.iso,
        service.duration_minutes ?? 60,
        customerName ?? conversation.customer_name ?? '',
        service.name,
        customerPhone
      )

      if (!result) {
        replyText =
          'Hemos guardado tu preferencia, pero no he podido confirmar el evento en el calendario. Un humano lo revisará.'
        wasDeterministic = true
        break
      }

      const { data: appointmentRow } = await supabase
        .from('appointments')
        .insert({
          business_id: business.id,
          conversation_id: conversation.id,
          service_id: service.id,
          customer_phone: customerPhone,
          customer_name: customerName ?? conversation.customer_name ?? null,
          scheduled_at: slot.iso,
          duration_minutes: service.duration_minutes,
          google_event_id: result.eventId,
        })
        .select('id')
        .single()

      // Schedule 24h reminder
      if (appointmentRow) {
        const reminderDelay = Math.max(
          0,
          Math.floor((new Date(slot.iso).getTime() - Date.now()) / 1000 - 24 * 3600)
        )
        if (reminderDelay > 0) {
          try {
            const job = await scheduleJob(
              { jobType: 'reminder_24h', appointmentId: appointmentRow.id, businessId: business.id },
              reminderDelay,
              '/api/worker/reminder'
            )
            await supabase
              .from('appointments')
              .update({ reminder_job_id: job.messageId })
              .eq('id', appointmentRow.id)
          } catch (error) {
            console.error('[Worker] Failed to schedule reminder', { error })
          }
        }
      }

      await clearConversationState(business.id, customerPhone)
      replyText = `✅ ¡Perfecto! Tu cita ha sido confirmada para ${slot.label}. Te enviaremos un recordatorio el día anterior.`
      wasDeterministic = true
      break
    }

    case 'BOOK_APPOINTMENT': {
      if (services.length === 0) {
        replyText =
          'Gracias por escribir. En este momento no tenemos servicios configurados para reserva online. Un humano se pondrá en contacto contigo.'
        wasDeterministic = true
        break
      }

      const targetService =
        services.find((s) =>
          classification.serviceMention
            ? s.name.toLowerCase().includes(classification.serviceMention.toLowerCase())
            : false
        ) ?? (services.length === 1 ? services[0] : null)

      if (!targetService) {
        const list = services.map((s, i) => `${i + 1}. ${s.name}`).join('\n')
        replyText = `¡Claro! ¿Para cuál de nuestros servicios quieres reservar?\n\n${list}\n\nResponde con el nombre o el número.`
        wasDeterministic = true
        break
      }

      if (!business.calendar_connected || !business.google_calendar_id || !business.google_access_token || !business.google_refresh_token) {
        replyText = `Perfecto, quieres reservar **${targetService.name}**. Un humano te contactará en breve para confirmar el horario.`
        wasDeterministic = true
        break
      }

      const slots = await getAvailableSlots(
        {
          accessToken: business.google_access_token,
          refreshToken: business.google_refresh_token,
          expiry: business.google_token_expiry,
        },
        business.google_calendar_id,
        targetService.duration_minutes ?? 60,
        7
      )

      if (slots.length === 0) {
        replyText =
          'En los próximos días no tenemos huecos disponibles. ¿Quieres que te avisemos cuando se libere uno?'
        wasDeterministic = true
        break
      }

      await setConversationState(business.id, customerPhone, {
        pendingSlots: slots,
        pendingServiceId: targetService.id,
        lastIntent: classification.intent,
        updatedAt: Date.now(),
      })

      const numbered = slots
        .map((s, i) => `${['1️⃣', '2️⃣', '3️⃣'][i] ?? `${i + 1}.`} ${s.label}`)
        .join('\n')
      replyText = `Tengo estos horarios disponibles para **${targetService.name}**:\n\n${numbered}\n\nResponde con el número de tu preferencia.`
      wasDeterministic = true
      break
    }

    case 'GREETING': {
      replyText = `¡Hola! Soy ${business.agent_name} de ${business.name}. ¿En qué puedo ayudarte hoy?`
      wasDeterministic = true
      break
    }

    case 'COMPLAINT': {
      replyText =
        'Entendemos tu situación y queremos resolverla. Vamos a trasladar tu mensaje a un miembro de nuestro equipo, que te contactará a la brevedad.'
      wasDeterministic = true

      await supabase
        .from('conversations')
        .update({ status: 'escalated' })
        .eq('id', conversation.id)

      if (business.escalation_email) {
        await sendEmail({
          to: business.escalation_email,
          subject: `[WhatAgent] Conversación escalada — ${customerPhone}`,
          html: escalationEmailHtml({
            businessName: business.name,
            customerPhone,
            customerName: customerName ?? conversation.customer_name,
            lastMessages: [...recentMessages, { role: 'user', content: messageText }],
          }),
        })
      }
      break
    }

    default: {
      // FAQ_*, GENERAL_INQUIRY, CANCEL_*, RESCHEDULE_*, CONFIRMATION, OUT_OF_SCOPE
      const systemPrompt = buildSystemPrompt(business, services)
      const result = await generateResponse(systemPrompt, recentMessages, messageText)
      replyText = result.content
      wasDeterministic = false
      modelUsed = result.model
      inputTokens += result.inputTokens ?? 0
      outputTokens += result.outputTokens ?? 0
      break
    }
  }

  // 12. Send via WhatsApp (Twilio)
  if (!business.twilio_account_sid || !business.twilio_auth_token || !business.twilio_whatsapp_number) {
    console.error('[Worker] Missing Twilio credentials for business', { businessId: business.id })
  } else {
    const sendResult = await sendTextMessage(
      business.twilio_account_sid,
      business.twilio_auth_token,
      business.twilio_whatsapp_number,
      customerPhone,
      replyText
    )
    if (!sendResult.success) {
      console.error('[Worker] WhatsApp send failed', { error: sendResult.error })
    } else {
      await incrementDailyMessageCount(business.id)
    }
  }

  // 13+14. Save assistant message + increment AI request counter (independent)
  const cost = calculateAnthropicCost(inputTokens, outputTokens, modelUsed ?? 'claude-haiku')
  const newCount = business.ai_requests_this_month + 1
  await Promise.all([
    supabase.from('messages').insert({
      conversation_id: conversation.id,
      business_id: business.id,
      role: 'assistant',
      content: replyText,
      intent_classified: classification.intent,
      intent_confidence: classification.confidence,
      was_deterministic: wasDeterministic,
      model_used: modelUsed ?? (wasDeterministic ? null : 'claude-haiku'),
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_microcents: cost,
      processing_time_ms: Date.now() - responseStart,
    } satisfies Partial<Message>),
    supabase
      .from('businesses')
      .update({ ai_requests_this_month: newCount })
      .eq('id', business.id),
  ])

  // 80% threshold alert
  if (
    business.plan !== 'agency' &&
    business.monthly_conversation_limit > 0 &&
    newCount >= Math.floor(business.monthly_conversation_limit * 0.8) &&
    business.ai_requests_this_month < Math.floor(business.monthly_conversation_limit * 0.8) &&
    business.email
  ) {
    await sendEmail({
      to: business.email,
      subject: '[WhatAgent] Has alcanzado el 80% de tu plan',
      html: `<p>Hola,</p><p>Has usado ${newCount} de ${business.monthly_conversation_limit} conversaciones este mes. Considera actualizar tu plan.</p>`,
    })
  }

  console.log('[Worker] Done', {
    businessId: business.id,
    intent: classification.intent,
    totalMs: Date.now() - startedAt,
  })
  return NextResponse.json({ ok: true })
}
