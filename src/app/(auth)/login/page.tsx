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
  email: z.email({ error: 'Email no válido' }),
  password: z.string().min(8, { error: 'Mínimo 8 caracteres' }),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { push, refresh } = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    setLoading(false)
    if (error) {
      toast.error(getAuthErrorMessage(error))
      return
    }
    toast.success('¡Bienvenido de vuelta!')
    push('/dashboard')
    refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inicia sesión</CardTitle>
        <CardDescription>Accede a tu panel de WhatAgent</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
        <p className="text-sm text-center mt-4 text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Regístrate
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
