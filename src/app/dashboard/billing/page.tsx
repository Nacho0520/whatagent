'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

const PLAN_PRICES: Record<string, { name: string; price: string }> = {
  trial: { name: 'Prueba Gratuita', price: '0€' },
  starter: { name: 'Plan Inicio', price: '79€/mes' },
  business: { name: 'Plan Negocio', price: '149€/mes' },
  agency: { name: 'Plan Agencia', price: '299€/mes' },
}

export default function BillingPage() {
  const [stats, setStats] = useState<{ aiRequestsUsed: number; aiRequestsLimit: number; plan: string } | null>(null)
  const [business, setBusiness] = useState<{ stripe_customer_id: string | null; plan_status: string; trial_ends_at: string } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void Promise.all([
      fetch('/api/dashboard/stats').then((r) => r.json()),
      fetch('/api/dashboard/business').then((r) => r.json()),
    ]).then(([s, b]) => {
      if (!s.error) setStats(s)
      if (b?.business) setBusiness(b.business)
    })
  }, [])

  const openPortal = async () => {
    setLoading(true)
    const res = await fetch('/api/billing/portal', { method: 'POST' })
    setLoading(false)
    if (!res.ok) { toast.error('No tienes una suscripción activa.'); return }
    const { url } = await res.json()
    window.location.href = url
  }

  const upgrade = async (plan: string) => {
    setLoading(true)
    const res = await fetch('/api/billing/create-checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Stripe no configurado'); return }
    const { url } = await res.json()
    window.location.href = url
  }

  if (!stats || !business) return <p className="text-muted-foreground">Cargando…</p>

  const planInfo = PLAN_PRICES[stats.plan] ?? PLAN_PRICES.trial
  const usagePct = stats.aiRequestsLimit === 0 ? 0 : (stats.aiRequestsUsed / stats.aiRequestsLimit) * 100

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">Facturación</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{planInfo.name}</CardTitle>
            <Badge variant={business.plan_status === 'active' ? 'default' : 'destructive'}>
              {business.plan_status}
            </Badge>
          </div>
          <CardDescription className="text-2xl font-bold text-foreground">{planInfo.price}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm mb-2">
            Conversaciones IA este mes: <strong>{stats.aiRequestsUsed} / {stats.aiRequestsLimit}</strong>
          </div>
          <Progress value={usagePct} className="h-2 mb-4" />
          {business.stripe_customer_id ? (
            <Button onClick={openPortal} disabled={loading}>Gestionar facturación</Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => upgrade('starter')} disabled={loading} variant="outline">Pasar a Inicio (79€)</Button>
              <Button onClick={() => upgrade('business')} disabled={loading}>Pasar a Negocio (149€)</Button>
              <Button onClick={() => upgrade('agency')} disabled={loading} variant="outline">Pasar a Agencia (299€)</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
