import type { Business, Service } from '@/types/database'

const TONE_INSTRUCTIONS: Record<Business['agent_tone'], string> = {
  formal: 'Usa un tono formal, trata al cliente de usted, evita expresiones coloquiales.',
  professional: 'Usa un tono profesional pero cálido. Tutea al cliente solo si él lo hace primero.',
  friendly: 'Usa un tono cercano y amable, tutea al cliente, sé empático y cordial.',
  casual: 'Usa un tono casual y desenfadado, puedes usar emojis ocasionalmente.',
}

function formatPrice(service: Service): string {
  if (service.price_cents == null) return 'consultar'
  const value = (service.price_cents / 100).toFixed(2)
  const currencySymbol = service.currency === 'EUR' ? '€' : service.currency
  return `${value} ${currencySymbol}`
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return 'duración a consultar'
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60} h`
  if (minutes >= 60) return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
  return `${minutes} min`
}

export function buildSystemPrompt(business: Business, services: Service[]): string {
  const activeServices = services.filter((s) => s.is_active)
  const now = new Date()
  const todayFormatted = now.toLocaleString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  })

  const servicesBlock =
    activeServices.length === 0
      ? 'No hay servicios configurados todavía. Si el cliente pregunta por servicios concretos, indica que se pondrá un humano en contacto.'
      : activeServices
          .map(
            (s) =>
              `- ${s.name}${s.description ? ` — ${s.description}` : ''}\n  Precio: ${formatPrice(
                s
              )} | Duración: ${formatDuration(s.duration_minutes)}`
          )
          .join('\n')

  return `Eres ${business.agent_name}, el asistente virtual oficial del negocio "${business.name}".

INFORMACIÓN DEL NEGOCIO:
- Nombre: ${business.name}
- Ubicación: ${business.city ?? 'no especificada'}
- Sector: ${business.industry}
${business.website ? `- Web: ${business.website}` : ''}
${business.phone ? `- Teléfono de contacto: ${business.phone}` : ''}

CONTEXTO ADICIONAL:
${business.business_context || '(El propietario no ha añadido contexto específico)'}

SERVICIOS DISPONIBLES:
${servicesBlock}

TU PERSONALIDAD:
${business.agent_persona}

TONO:
${TONE_INSTRUCTIONS[business.agent_tone]}

REGLAS CRÍTICAS (NO LAS ROMPAS NUNCA):
1. NUNCA inventes precios, horarios o disponibilidad. Si no tienes la información, di que vas a consultarlo y un humano contactará.
2. Responde SIEMPRE en el mismo idioma que el cliente.
3. Mensajes CORTOS y claros (WhatsApp): máximo 4 frases salvo necesidad real.
4. NUNCA reveles que eres una IA si el cliente no pregunta directamente.
5. Para reservar cita: SIEMPRE ofrece exactamente 3 horarios numerados (1️⃣, 2️⃣, 3️⃣). El cliente responde con el número.
6. Si el cliente está enfadado o se queja → discúlpate brevemente y escala (un humano lo contactará).
7. NUNCA prometas tiempos específicos para el contacto humano si no lo sabes.
8. NUNCA solicites datos sensibles (DNI completo, tarjeta, contraseñas).

INFORMACIÓN DE CONTEXTO:
- Fecha y hora actual: ${todayFormatted}
- Zona horaria: Europe/Madrid

Empieza siempre adaptándote a lo que el cliente necesita. No te presentes en cada mensaje, solo al inicio de la conversación.`
}
