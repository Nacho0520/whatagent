'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const INDUSTRIES = [
  'general', 'clinica_estetica', 'peluqueria', 'restaurante', 'salud',
  'odontologia', 'gimnasio', 'taller_mecanico', 'inmobiliaria', 'consultoria',
  'tienda_local', 'servicios_profesionales',
]

const INDUSTRY_LABELS: Record<string, string> = {
  general: 'General',
  clinica_estetica: 'Clínica de estética',
  peluqueria: 'Peluquería / Barbería',
  restaurante: 'Restaurante',
  salud: 'Salud / Clínica médica',
  odontologia: 'Odontología',
  gimnasio: 'Gimnasio / Fitness',
  taller_mecanico: 'Taller mecánico',
  inmobiliaria: 'Inmobiliaria',
  consultoria: 'Consultoría',
  tienda_local: 'Tienda local',
  servicios_profesionales: 'Servicios profesionales',
}

const schema = z.object({
  name: z.string().min(2),
  industry: z.string(),
  city: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function OnboardingStep1() {
  const { push } = useRouter()
  const [loading, setLoading] = useState(false)
  const [industry, setIndustry] = useState('general')
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { industry: 'general' },
  })

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/dashboard/business')
      if (!res.ok) return
      const { business } = await res.json()
      if (business) {
        reset({
          name: business.name,
          industry: business.industry ?? 'general',
          city: business.city ?? '',
          phone: business.phone ?? '',
          website: business.website ?? '',
        })
        setIndustry(business.industry ?? 'general')
      }
    })()
  }, [reset])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const res = await fetch('/api/dashboard/business', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, onboarding_step: 2 }),
    })
    setLoading(false)
    if (!res.ok) {
      toast.error('No se pudo guardar')
      return
    }
    push('/onboarding/whatsapp')
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Cuéntanos sobre tu negocio</h2>
      <p className="text-muted-foreground mb-6">Esta información ayudará a la IA a responder mejor.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del negocio *</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Sector *</Label>
          <Select
            value={industry}
            onValueChange={(v) => {
              if (!v) return
              setIndustry(v)
              setValue('industry', v)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona…" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((key) => (
                <SelectItem key={key} value={key}>{INDUSTRY_LABELS[key]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <Input id="city" {...register('city')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono de contacto</Label>
            <Input id="phone" {...register('phone')} placeholder="+34 612 345 678" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Web (opcional)</Label>
          <Input id="website" {...register('website')} placeholder="https://" />
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando…' : 'Siguiente → Conectar WhatsApp'}
          </Button>
        </div>
      </form>
    </div>
  )
}
