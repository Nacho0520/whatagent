import Anthropic from '@anthropic-ai/sdk'
import type { ClassificationResult, ConversationContext, Intent } from '@/types/ai'
import type { Service } from '@/types/database'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const CLASSIFIER_MODEL = 'claude-haiku-4-5-20251001'

const VALID_INTENTS: Intent[] = [
  'BOOK_APPOINTMENT',
  'APPOINTMENT_SELECTION',
  'CANCEL_APPOINTMENT',
  'RESCHEDULE_APPOINTMENT',
  'FAQ_HOURS',
  'FAQ_PRICE',
  'FAQ_SERVICES',
  'FAQ_LOCATION',
  'GENERAL_INQUIRY',
  'COMPLAINT',
  'GREETING',
  'OUT_OF_SCOPE',
  'CONFIRMATION',
]

const CLASSIFIER_SYSTEM = `Eres un clasificador de intenciones para un asistente de WhatsApp de un negocio.
Tu única tarea es analizar el último mensaje del cliente (en su idioma) y devolver UN ÚNICO objeto JSON con esta forma exacta:

{
  "intent": "<uno de: BOOK_APPOINTMENT | APPOINTMENT_SELECTION | CANCEL_APPOINTMENT | RESCHEDULE_APPOINTMENT | FAQ_HOURS | FAQ_PRICE | FAQ_SERVICES | FAQ_LOCATION | GENERAL_INQUIRY | COMPLAINT | GREETING | OUT_OF_SCOPE | CONFIRMATION>",
  "confidence": <número entre 0 y 1>,
  "selectedSlotIndex": <1, 2 o 3 SOLO si intent es APPOINTMENT_SELECTION; si no, omitir>,
  "serviceMention": "<nombre del servicio si lo menciona; si no, omitir>"
}

Reglas:
- "1", "2", "3", "uno", "dos", "tres", "el primero", "el segundo", "el tercero" en contexto de espera de selección de cita → APPOINTMENT_SELECTION con selectedSlotIndex correspondiente.
- "hola", "buenas", "buenos días", "hi" → GREETING.
- Quejas, frustración, lenguaje hostil → COMPLAINT (confianza alta).
- "quiero reservar", "agendar", "pedir cita", "cita" → BOOK_APPOINTMENT.
- "cancelar mi cita" → CANCEL_APPOINTMENT. "cambiar mi cita" → RESCHEDULE_APPOINTMENT.
- Preguntas sobre horarios → FAQ_HOURS. Sobre precios → FAQ_PRICE. Sobre qué hacen → FAQ_SERVICES. Sobre dirección/dónde → FAQ_LOCATION.
- Si el mensaje no tiene relación con el negocio (spam, conversación random) → OUT_OF_SCOPE.
- "sí", "ok", "vale", "perfecto" sin contexto de slots → CONFIRMATION.
- Resto → GENERAL_INQUIRY.

Devuelve SOLO el JSON, sin texto adicional, sin markdown, sin explicaciones.`

interface ClassifierContext {
  recentMessages: ConversationContext
  hasPendingSlots: boolean
  services?: Service[]
}

function parseSlotIndex(text: string): number | undefined {
  const cleaned = text.trim().toLowerCase()
  if (/^[1-3]$/.test(cleaned)) return parseInt(cleaned, 10)
  if (/^(uno|primero|primer|la primera|el primero)\b/.test(cleaned)) return 1
  if (/^(dos|segundo|segunda|la segunda|el segundo)\b/.test(cleaned)) return 2
  if (/^(tres|tercero|tercera|la tercera|el tercero)\b/.test(cleaned)) return 3
  return undefined
}

export async function classifyIntent(
  message: string,
  context: ClassifierContext
): Promise<ClassificationResult> {
  // Fast path: if pending slots and message looks like a number, deterministic.
  if (context.hasPendingSlots) {
    const slot = parseSlotIndex(message)
    if (slot) {
      return {
        intent: 'APPOINTMENT_SELECTION',
        confidence: 0.99,
        requiresLLM: false,
        requiresCalendar: true,
        requiresEscalation: false,
        selectedSlotIndex: slot,
      }
    }
  }

  const historyText = context.recentMessages
    .slice(-4)
    .map((m) => `${m.role === 'user' ? 'CLIENTE' : 'AGENTE'}: ${m.content}`)
    .join('\n')

  const userPrompt = `${historyText ? `Historial reciente:\n${historyText}\n\n` : ''}Último mensaje del CLIENTE: "${message}"${
    context.hasPendingSlots ? '\n\n(Contexto: hay 3 horarios de cita pendientes de selección)' : ''
  }`

  try {
    const response = await anthropic.messages.create({
      model: CLASSIFIER_MODEL,
      max_tokens: 200,
      system: CLASSIFIER_SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const raw = textBlock?.type === 'text' ? textBlock.text.trim() : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in classifier response')

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ClassificationResult>
    const intent = (VALID_INTENTS as string[]).includes(parsed.intent ?? '')
      ? (parsed.intent as Intent)
      : 'GENERAL_INQUIRY'
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5

    return {
      intent,
      confidence,
      requiresLLM: !['APPOINTMENT_SELECTION', 'GREETING'].includes(intent),
      requiresCalendar: ['BOOK_APPOINTMENT', 'APPOINTMENT_SELECTION', 'CANCEL_APPOINTMENT', 'RESCHEDULE_APPOINTMENT'].includes(intent),
      requiresEscalation: intent === 'COMPLAINT' || confidence < 0.5,
      selectedSlotIndex: parsed.selectedSlotIndex,
      serviceMention: parsed.serviceMention,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    }
  } catch (error) {
    console.error('[Classifier] Error', { error: error instanceof Error ? error.message : error })
    return {
      intent: 'GENERAL_INQUIRY',
      confidence: 0.3,
      requiresLLM: true,
      requiresCalendar: false,
      requiresEscalation: false,
    }
  }
}
