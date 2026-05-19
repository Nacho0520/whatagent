'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function SettingsPage() {
  const [business, setBusiness] = useState<Record<string, string | null | undefined>>({})
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const res = await fetch('/api/dashboard/business')
    if (res.ok) setBusiness((await res.json()).business)
  }
  useEffect(() => { void load() }, [])

  const update = (k: string, v: string) => setBusiness((b) => ({ ...b, [k]: v }))

  const save = async (fields: string[]) => {
    setSaving(true)
    const body: Record<string, unknown> = {}
    for (const f of fields) body[f] = business[f] ?? null
    const res = await fetch('/api/dashboard/business', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    toast[res.ok ? 'success' : 'error'](res.ok ? 'Guardado' : 'Error')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Configuración</h1>

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Negocio</TabsTrigger>
          <TabsTrigger value="agent">Agente IA</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card className="p-6 space-y-4 max-w-2xl">
            <Field id="name" label="Nombre del negocio" value={business.name ?? ''} onChange={(v) => update('name', v)} />
            <Field id="city" label="Ciudad" value={business.city ?? ''} onChange={(v) => update('city', v)} />
            <Field id="phone" label="Teléfono" value={business.phone ?? ''} onChange={(v) => update('phone', v)} />
            <Field id="email" label="Email" value={business.email ?? ''} onChange={(v) => update('email', v)} />
            <Field id="website" label="Web" value={business.website ?? ''} onChange={(v) => update('website', v)} />
            <Button onClick={() => save(['name', 'city', 'phone', 'email', 'website'])} disabled={saving}>Guardar</Button>
          </Card>
        </TabsContent>

        <TabsContent value="agent">
          <Card className="p-6 space-y-4 max-w-2xl">
            <Field id="agent_name" label="Nombre del agente" value={business.agent_name ?? ''} onChange={(v) => update('agent_name', v)} />
            <div className="space-y-2">
              <Label>Tono</Label>
              <Select value={(business.agent_tone as string) ?? 'professional'} onValueChange={(v) => v && update('agent_tone', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="professional">Profesional</SelectItem>
                  <SelectItem value="friendly">Cercano</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contexto del negocio</Label>
              <Textarea
                rows={6}
                value={business.business_context ?? ''}
                onChange={(e) => update('business_context', e.target.value)}
              />
            </div>
            <Field id="escalation_email" label="Email de escalación" value={business.escalation_email ?? ''} onChange={(v) => update('escalation_email', v)} />
            <Button onClick={() => save(['agent_name', 'agent_tone', 'business_context', 'escalation_email'])} disabled={saving}>Guardar</Button>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card className="p-6 max-w-2xl space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="font-medium">Configuración de WhatsApp (Twilio)</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${business.whatsapp_connected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                {business.whatsapp_connected ? 'Conectado' : 'No conectado'}
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilio_account_sid">Account SID</Label>
              <Input
                id="twilio_account_sid"
                value={business.twilio_account_sid
                  ? `AC****${(business.twilio_account_sid as string).slice(-4)}`
                  : ''}
                onChange={(e) => update('twilio_account_sid', e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                onFocus={(e) => { e.target.value = (business.twilio_account_sid as string) ?? '' }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilio_auth_token">Auth Token</Label>
              <Input
                id="twilio_auth_token"
                type="password"
                value={business.twilio_auth_token ? '••••••••' : ''}
                onChange={(e) => update('twilio_auth_token', e.target.value)}
                placeholder="Tu Auth Token de Twilio"
                onFocus={(e) => { e.target.value = (business.twilio_auth_token as string) ?? '' }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilio_whatsapp_number">Número WhatsApp</Label>
              <Input
                id="twilio_whatsapp_number"
                value={(business.twilio_whatsapp_number as string) ?? ''}
                onChange={(e) => update('twilio_whatsapp_number', e.target.value)}
                placeholder="whatsapp:+14155238886"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => save(['twilio_account_sid', 'twilio_auth_token', 'twilio_whatsapp_number'])} disabled={saving}>
                Guardar
              </Button>
              <Button variant="outline" render={<Link href="/onboarding/whatsapp" />}>
                Reconectar WhatsApp
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Field({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
