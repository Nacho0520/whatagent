import { google } from 'googleapis'
import type { PendingSlot } from '@/types/database'

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiry?: Date | string | null
}

function buildOAuthClient(tokens?: Partial<OAuthTokens>) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_OAUTH_REDIRECT_URI!
  )
  if (tokens?.accessToken) {
    client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: tokens.expiry ? new Date(tokens.expiry).getTime() : undefined,
    })
  }
  return client
}

export function getAuthUrl(state?: string): string {
  const client = buildOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    state,
  })
}

export async function exchangeAuthCode(code: string) {
  const client = buildOAuthClient()
  const { tokens } = await client.getToken(code)
  return {
    accessToken: tokens.access_token ?? '',
    refreshToken: tokens.refresh_token ?? '',
    expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    scope: tokens.scope,
  }
}

export async function refreshAccessToken(refreshToken: string) {
  const client = buildOAuthClient({ accessToken: '', refreshToken })
  const { credentials } = await client.refreshAccessToken()
  return {
    accessToken: credentials.access_token ?? '',
    expiry: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
  }
}

async function ensureFreshTokens(tokens: OAuthTokens): Promise<OAuthTokens> {
  if (!tokens.expiry) return tokens
  const expiryDate = new Date(tokens.expiry)
  const minutesUntilExpiry = (expiryDate.getTime() - Date.now()) / 1000 / 60
  if (minutesUntilExpiry > 5) return tokens
  const refreshed = await refreshAccessToken(tokens.refreshToken)
  return {
    accessToken: refreshed.accessToken,
    refreshToken: tokens.refreshToken,
    expiry: refreshed.expiry,
  }
}

const WEEKDAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function formatSlotForDisplay(slot: Date): string {
  const weekday = WEEKDAYS_ES[slot.getDay()]
  const day = slot.getDate()
  const month = MONTHS_ES[slot.getMonth()]
  const hours = slot.getHours().toString().padStart(2, '0')
  const minutes = slot.getMinutes().toString().padStart(2, '0')
  return `${weekday} ${day} de ${month} a las ${hours}:${minutes}`
}

/**
 * Returns 3 candidate slots within business hours (9-19, Mon-Sat) that are FREE
 * according to Google Calendar's free/busy query.
 */
export async function getAvailableSlots(
  tokens: OAuthTokens,
  calendarId: string,
  durationMinutes: number,
  daysAhead = 7
): Promise<PendingSlot[]> {
  const fresh = await ensureFreshTokens(tokens)
  const auth = buildOAuthClient(fresh)
  const calendar = google.calendar({ version: 'v3', auth })

  const now = new Date()
  const start = new Date(now.getTime() + 60 * 60 * 1000) // start 1h from now
  const end = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  const fbRes = await calendar.freebusy.query({
    requestBody: {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      items: [{ id: calendarId }],
      timeZone: 'Europe/Madrid',
    },
  })
  const busy = fbRes.data.calendars?.[calendarId]?.busy ?? []

  const isBusy = (slotStart: Date, slotEnd: Date) =>
    busy.some((b) => {
      const bs = new Date(b.start ?? '').getTime()
      const be = new Date(b.end ?? '').getTime()
      return slotStart.getTime() < be && slotEnd.getTime() > bs
    })

  const slots: PendingSlot[] = []
  const cursor = new Date(start)
  cursor.setMinutes(0, 0, 0)
  if (cursor.getHours() < 9) cursor.setHours(9)
  if (cursor.getHours() >= 19) {
    cursor.setDate(cursor.getDate() + 1)
    cursor.setHours(9)
  }

  while (slots.length < 3 && cursor < end) {
    const dow = cursor.getDay()
    const hour = cursor.getHours()
    const inBusinessHours = dow !== 0 && hour >= 9 && hour < 19 // closed Sundays
    if (inBusinessHours) {
      const slotEnd = new Date(cursor.getTime() + durationMinutes * 60 * 1000)
      if (!isBusy(cursor, slotEnd)) {
        const iso = cursor.toISOString()
        slots.push({
          index: slots.length + 1,
          iso,
          label: formatSlotForDisplay(cursor),
        })
        // advance enough so we don't propose adjacent slots
        cursor.setTime(cursor.getTime() + Math.max(durationMinutes, 60) * 60 * 1000)
        continue
      }
    }
    // advance 1 hour
    cursor.setTime(cursor.getTime() + 60 * 60 * 1000)
    if (cursor.getHours() >= 19) {
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(9, 0, 0, 0)
    }
  }

  return slots
}

export async function createAppointment(
  tokens: OAuthTokens,
  calendarId: string,
  slotIso: string,
  durationMinutes: number,
  customerName: string,
  serviceName: string,
  customerPhone: string
): Promise<{ eventId: string } | null> {
  const fresh = await ensureFreshTokens(tokens)
  const auth = buildOAuthClient(fresh)
  const calendar = google.calendar({ version: 'v3', auth })

  const start = new Date(slotIso)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

  try {
    const result = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `${serviceName} — ${customerName || customerPhone}`,
        description: `Cita reservada vía WhatAgent.\nCliente: ${customerName ?? '—'}\nTeléfono: ${customerPhone}\nServicio: ${serviceName}`,
        start: { dateTime: start.toISOString(), timeZone: 'Europe/Madrid' },
        end: { dateTime: end.toISOString(), timeZone: 'Europe/Madrid' },
      },
    })
    return { eventId: result.data.id ?? '' }
  } catch (error) {
    console.error('[Calendar] createAppointment failed', { error })
    return null
  }
}

export async function cancelAppointment(
  tokens: OAuthTokens,
  calendarId: string,
  eventId: string
): Promise<boolean> {
  const fresh = await ensureFreshTokens(tokens)
  const auth = buildOAuthClient(fresh)
  const calendar = google.calendar({ version: 'v3', auth })
  try {
    await calendar.events.delete({ calendarId, eventId })
    return true
  } catch (error) {
    console.error('[Calendar] cancelAppointment failed', { error })
    return false
  }
}
