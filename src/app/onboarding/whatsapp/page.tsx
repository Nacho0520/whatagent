'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function OnboardingWhatsApp() {
  const { push } = useRouter()
  const [connected, setConnected] = useState(false)
  const [accountSid, setAccountSid] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/dashboard/business')
      if (!res.ok) return
      const { business } = await res.json()
      if (business?.whatsapp_connected) setConnected(true)
    })()
  }, [])

  const save = async () => {
    if (!accountSid || !authToken || !whatsappNumber) {
      toast.error('Rellena todos los campos')
      return
    }
    if (!whatsappNumber.startsWith('whatsapp:')) {
      toast.error('El número debe comenzar con "whatsapp:"')
      return
    }
    setLoading(true)
    const res = await fetch('/api/onboarding/connect-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountSid, authToken, whatsappNumber }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Error al guardar')
      return
    }
    setConnected(true)
    toast.success('WhatsApp conectado con Twilio')
  }

  const nextStep = async () => {
    await fetch('/api/dashboard/business', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding_step: 3 }),
    })
    push('/onboarding/agent')
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Conecta tu WhatsApp con Twilio</h2>
      <p className="text-muted-foreground mb-6">
        Usa el sandbox de WhatsApp de Twilio para conectar tu número y empezar a recibir mensajes con la IA.
      </p>

      {connected ? (
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900">
            <p className="font-medium text-emerald-700 dark:text-emerald-400">✓ WhatsApp conectado con Twilio</p>
            <p className="text-sm text-muted-foreground mt-1">
              Para probar, envía el mensaje <strong>"join [tu-palabra-sandbox]"</strong> al número{' '}
              <strong>+14155238886</strong> desde tu WhatsApp.{' '}
              <a
                href="https://www.twilio.com/docs/whatsapp/sandbox"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Ver documentación del sandbox →
              </a>
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={nextStep}>Siguiente → Configurar Agente</Button>
          </div>
        </div>
      ) : (
        <div className="max-w-xl space-y-6">
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex-none w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
              <span>
                Crea una cuenta gratuita en{' '}
                <a href="https://twilio.com" target="_blank" rel="noopener noreferrer" className="underline">
                  twilio.com
                </a>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-none w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
              <span>
                Activa el sandbox de WhatsApp en{' '}
                <strong>Twilio Console → Messaging → Try it out → Send a WhatsApp message</strong>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-none w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
              <span>Copia tus credenciales aquí abajo</span>
            </li>
          </ol>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountSid">Account SID</Label>
              <Input
                id="accountSid"
                value={accountSid}
                onChange={(e) => setAccountSid(e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authToken">Auth Token</Label>
              <Input
                id="authToken"
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Tu Auth Token de Twilio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">Número WhatsApp</Label>
              <Input
                id="whatsappNumber"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="whatsapp:+14155238886"
              />
              <p className="text-xs text-muted-foreground">Incluye el prefijo 'whatsapp:'</p>
            </div>
            <Button onClick={save} disabled={loading} className="w-full">
              {loading ? 'Guardando…' : 'Guardar y continuar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
