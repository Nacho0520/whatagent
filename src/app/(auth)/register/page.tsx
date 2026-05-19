'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  businessName: z.string().min(2, { error: 'Nombre demasiado corto' }),
  email: z.email({ error: 'Email no válido' }),
  password: z
    .string()
    .min(8, { error: 'Mínimo 8 caracteres' })
    .regex(/[0-9]/, { error: 'Debe contener al menos un número' }),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const { push, refresh } = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { business_name: data.businessName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setLoading(false)
      toast.error(error.message)
      return
    }

    // Create business record
    const res = await fetch('/api/dashboard/business', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.businessName }),
    })

    setLoading(false)

    if (!res.ok) {
      // Maybe email confirmation required
      toast.success('Cuenta creada. Revisa tu email para confirmar.')
      push('/login')
      return
    }

    toast.success('¡Cuenta creada! Vamos a configurar tu negocio.')
    push('/onboarding')
    refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>Empieza tu prueba gratuita de 14 días</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Nombre del negocio</Label>
            <Input id="businessName" {...register('businessName')} />
            {errors.businessName && <p className="text-xs text-destructive">{errors.businessName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </Button>
        </form>
        <p className="text-sm text-center mt-4 text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
