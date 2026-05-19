'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

function CalendarContent() {
  const { push } = useRouter()
  const params = useSearchParams()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (params.get('connected')) {
      toast.success('Google Calendar conectado')
    }
    if (params.get('error')) {
      toast.error('No se pudo conectar el calendario')
    }
    void (async () => {
      const res = await fetch('/api/dashboard/business')
      if (!res.ok) return
      const { business } = await res.json()
      if (business?.calendar_connected) setConnected(true)
    })()
  }, [params])

  const connectGoogle = () => {
    window.location.href = '/api/onboarding/connect-calendar?initiate=1'
  }

  const next = async () => {
    await fetch('/api/dashboard/business', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding_step: 5 }),
    })
    push('/onboarding/activate')
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-bold mb-2">Conecta Google Calendar</h2>
      <p className="text-muted-foreground mb-6">
        El agente comprobará disponibilidad y creará eventos automáticamente al reservar citas.
      </p>

      {connected ? (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900 mb-6">
          <p className="font-medium text-emerald-700 dark:text-emerald-400">✓ Google Calendar conectado</p>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          <Button onClick={connectGoogle} className="w-full">Conectar Google Calendar</Button>
          <p className="text-sm text-muted-foreground">
            Si te saltas este paso, podrás conectar el calendario después desde Ajustes. Sin él, la IA recogerá la
            preferencia del cliente pero no podrá crear el evento.
          </p>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={next}>Saltar este paso</Button>
        <Button onClick={next}>Siguiente → Activar</Button>
      </div>
    </div>
  )
}

export default function OnboardingCalendar() {
  return (
    <Suspense fallback={<div>Cargando…</div>}>
      <CalendarContent />
    </Suspense>
  )
}
