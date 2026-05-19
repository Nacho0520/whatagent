'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'

interface ServiceForm {
  id?: string
  name: string
  description?: string
  price_cents?: number | null
  duration_minutes?: number | null
}

const PLACEHOLDER = 'Somos una clínica de estética en Madrid. Ofrecemos tratamientos faciales, depilación y masajes. Abrimos de lunes a viernes de 9:00 a 20:00 y sábados de 10:00 a 14:00. Estamos en calle Mayor 1.'

export default function OnboardingAgent() {
  const { push } = useRouter()
  const [loading, setLoading] = useState(false)
  const [agentName, setAgentName] = useState('Asistente')
  const [agentTone, setAgentTone] = useState('professional')
  const [businessContext, setBusinessContext] = useState('')
  const [escalationEmail, setEscalationEmail] = useState('')
  const [services, setServices] = useState<ServiceForm[]>([])

  useEffect(() => {
    void (async () => {
      const [b, s] = await Promise.all([
        fetch('/api/dashboard/business').then((r) => r.json()),
        fetch('/api/dashboard/services').then((r) => r.json()),
      ])
      if (b?.business) {
        setAgentName(b.business.agent_name ?? 'Asistente')
        setAgentTone(b.business.agent_tone ?? 'professional')
        setBusinessContext(b.business.business_context ?? '')
        setEscalationEmail(b.business.escalation_email ?? '')
      }
      if (s?.services) setServices(s.services)
    })()
  }, [])

  const addService = () => setServices((s) => [...s, { name: '', description: '', price_cents: null, duration_minutes: 60 }])
  const removeService = async (idx: number) => {
    const item = services[idx]
    if (item.id) await fetch(`/api/dashboard/services/${item.id}`, { method: 'DELETE' })
    setServices((s) => s.filter((_, i) => i !== idx))
  }
  const updateService = (idx: number, patch: Partial<ServiceForm>) => {
    setServices((s) => s.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const saveAll = async () => {
    setLoading(true)
    // 1. Save business
    await fetch('/api/dashboard/business', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_name: agentName,
        agent_tone: agentTone,
        business_context: businessContext,
        escalation_email: escalationEmail || null,
        onboarding_step: 4,
      }),
    })

    // 2. Save services in parallel
    await Promise.all(services.filter((svc) => svc.name).map((svc) =>
      svc.id
        ? fetch(`/api/dashboard/services/${svc.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: svc.name,
              description: svc.description,
              price_cents: svc.price_cents,
              duration_minutes: svc.duration_minutes,
            }),
          })
        : fetch('/api/dashboard/services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: svc.name,
              description: svc.description,
              price_cents: svc.price_cents,
              duration_minutes: svc.duration_minutes,
            }),
          })
    ))
    setLoading(false)
    toast.success('Configuración guardada')
    push('/onboarding/calendar')
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Configura tu agente IA</h2>
        <p className="text-muted-foreground">Personaliza cómo responde la IA a tus clientes.</p>
      </div>

      <div className="space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="agentName">Nombre del agente</Label>
            <Input id="agentName" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tono</Label>
            <Select value={agentTone} onValueChange={(v) => v && setAgentTone(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="professional">Profesional</SelectItem>
                <SelectItem value="friendly">Cercano</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ctx">Contexto del negocio</Label>
          <Textarea
            id="ctx"
            rows={6}
            placeholder={PLACEHOLDER}
            value={businessContext}
            onChange={(e) => setBusinessContext(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Cuanto más detalle, mejor responderá el agente.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email para escalación humana</Label>
          <Input
            id="email"
            type="email"
            placeholder="responsable@minegocio.com"
            value={escalationEmail}
            onChange={(e) => setEscalationEmail(e.target.value)}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Servicios</h3>
          <Button variant="outline" size="sm" onClick={addService}>
            <Plus className="w-4 h-4 mr-1" /> Añadir servicio
          </Button>
        </div>

        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Aún no has añadido servicios.</p>
        ) : (
          <div className="space-y-4">
            {services.map((svc, i) => (
              <div key={svc.id ?? JSON.stringify(svc)} className="grid grid-cols-1 md:grid-cols-6 gap-2 p-3 border rounded-lg">
                <div className="md:col-span-2">
                  <Label className="text-xs">Nombre</Label>
                  <Input value={svc.name} onChange={(e) => updateService(i, { name: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Descripción</Label>
                  <Input value={svc.description ?? ''} onChange={(e) => updateService(i, { description: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Precio (€)</Label>
                  <Input
                    type="number"
                    value={svc.price_cents == null ? '' : (svc.price_cents / 100).toString()}
                    onChange={(e) => updateService(i, { price_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Duración (min)</Label>
                    <Input
                      type="number"
                      value={svc.duration_minutes ?? ''}
                      onChange={(e) => updateService(i, { duration_minutes: e.target.value ? parseInt(e.target.value, 10) : null })}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeService(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={saveAll} disabled={loading}>
          {loading ? 'Guardando…' : 'Siguiente → Conectar calendario'}
        </Button>
      </div>
    </div>
  )
}
