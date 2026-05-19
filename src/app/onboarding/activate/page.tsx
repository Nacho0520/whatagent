'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, AlertCircle } from 'lucide-react'

const PLANS = [
  { key: 'trial', name: 'Prueba Gratuita', price: '0€ · 14 días', features: ['50 conversaciones', '1 número'], highlight: false },
  { key: 'starter', name: 'Inicio', price: '79€/mes', features: ['500 conversaciones', 'Recordatorios'], highlight: false },
  { key: 'business', name: 'Negocio', price: '149€/mes', features: ['2.000 conversaciones', 'Follow-ups', 'Reseñas', 'Base de conocimiento'], highlight: true },
  { key: 'agency', name: 'Agencia', price: '299€/mes', features: ['Ilimitado', '10 números', 'Todo incluido'], highlight: false },
] as const

export default function OnboardingActivate() {
  const { push } = useRouter()
  const [business, setBusiness] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/dashboard/business')
      if (res.ok) setBusiness((await res.json()).business)
    })()
  }, [])

  const activate = async (planKey: string) => {
    setLoading(planKey)
    if (planKey === 'trial') {
      const r = await fetch('/api/dashboard/business', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_completed: true, is_active: true }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        toast.error((err as { error?: string }).error ?? 'Error al activar. Inténtalo de nuevo.')
        setLoading(null)
        return
      }
      toast.success('¡Activado! Empieza a recibir mensajes.')
      push('/dashboard')
      return
    }
    const res = await fetch('/api/billing/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planKey }),
    })
    setLoading(null)
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error === 'price_not_configured'
        ? 'Stripe aún no está configurado. Usa la prueba gratuita.'
        : err.error ?? 'Error')
      return
    }
    const { url } = await res.json()
    window.location.href = url
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">¡Casi listo!</h2>
      <p className="text-muted-foreground mb-8">Elige tu plan y empieza a recibir mensajes en WhatsApp.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Status label="WhatsApp conectado" ok={!!business?.whatsapp_connected} />
        <Status label="Calendario conectado" ok={!!business?.calendar_connected} optional />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((p) => (
          <Card key={p.key} className={p.highlight ? 'border-primary shadow-md' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{p.name}</CardTitle>
                {p.highlight && <Badge>Popular</Badge>}
              </div>
              <CardDescription className="text-2xl font-bold text-foreground">{p.price}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 mb-4">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={p.highlight ? 'default' : 'outline'}
                className="w-full"
                onClick={() => activate(p.key)}
                disabled={loading !== null}
              >
                {loading === p.key ? 'Procesando…' : p.key === 'trial' ? 'Empezar gratis' : 'Suscribirse'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm">
        <p className="font-medium mb-1">Próximo paso: probar tu agente</p>
        <p className="text-muted-foreground">Después de activar, envía un mensaje de WhatsApp a tu número desde tu móvil personal. Verás cómo responde la IA en segundos.</p>
      </div>
    </div>
  )
}

function Status({ label, ok, optional }: { label: string; ok: boolean; optional?: boolean }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border">
      {ok ? (
        <Check className="w-5 h-5 text-emerald-600" />
      ) : (
        <AlertCircle className={`w-5 h-5 ${optional ? 'text-amber-500' : 'text-red-500'}`} />
      )}
      <span className="text-sm">{label}{optional && !ok ? ' (opcional)' : ''}</span>
    </div>
  )
}
