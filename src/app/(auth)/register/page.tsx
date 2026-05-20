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

function getAuthErrorMessage(error: { message?: string; status?: number }): string {
  const msg = error.message?.toLowerCase() ?? ''
  if (msg.includes('rate limit') || error.status === 429) {
    return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
  }
  if (msg.includes('already registered') || msg.includes('user already exists')) {
    return 'Este email ya está registrado. Prueba a iniciar sesión.'
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Email o contraseña incorrectos.'
  }
  if (msg.includes('email not confirmed')) {
    return 'Confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.'
  }
  if (msg.includes('password') && msg.includes('weak')) {
    return 'La contraseña es demasiado débil. Usa al menos 8 caracteres con letras y números.'
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Error de conexión. Comprueba tu internet e inténtalo de nuevo.'
  }
  return 'Ha ocurrido un error. Inténtalo de nuevo.'
}

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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const password = watch('password')

  const onSubmit = async (data: FormData) => {
    if (data.password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (!acceptedTerms) {
      toast.error('Debes aceptar los Términos de Servicio y la Política de Privacidad')
      return
    }

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
      toast.error(getAuthErrorMessage(error))
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
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              required
            />
            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
            )}
          </div>
          <div className="flex items-start gap-2">
            <input
              id="terms"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              required
              className="mt-1"
            />
            <label htmlFor="terms" className="text-sm text-muted-foreground">
              Acepto los{' '}
              <a href="/terms" target="_blank" className="underline hover:text-foreground">
                Términos de Servicio
              </a>{' '}
              y la{' '}
              <a href="/privacy" target="_blank" className="underline hover:text-foreground">
                Política de Privacidad
              </a>
            </label>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !acceptedTerms}>
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
