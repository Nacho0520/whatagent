import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = (await req.json()) as {
    accountSid?: string
    authToken?: string
    whatsappNumber?: string
  }

  const { accountSid, authToken, whatsappNumber } = body

  if (!accountSid || !authToken || !whatsappNumber) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  if (!whatsappNumber.startsWith('whatsapp:')) {
    return NextResponse.json({ error: 'invalid_number_format' }, { status: 400 })
  }

  const { error } = await supabase
    .from('businesses')
    .update({
      twilio_account_sid: accountSid,
      twilio_auth_token: authToken,
      twilio_whatsapp_number: whatsappNumber,
      whatsapp_connected: true,
    })
    .eq('owner_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
