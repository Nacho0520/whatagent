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
      toast.error(error.message)
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
