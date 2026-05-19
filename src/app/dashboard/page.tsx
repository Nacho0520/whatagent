'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

interface Stats {
  conversationsThisMonth: number
  appointmentsThisMonth: number
  aiRequestsUsed: number
  aiRequestsLimit: number
  escalatedCount: number
  twilioWhatsappNumber: string | null
  whatsappConnected: boolean
  plan: string
  statusBreakdown: Record<string, number>
}

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentConvs, setRecentConvs] = useState<Array<{ id: string; customer_phone: string; status: string; last_message_at: string }>>([])
  const [upcomingAppts, setUpcomingAppts] = useState<Array<{ id: string; customer_name: string | null; customer_phone: string; scheduled_at: string }>>([])
  const dateFormatter = useSyncExternalStore(
    () => () => {},
    () => (date: string) => new Date(date).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }),
    () => () => ''
  )

  useEffect(() => {
    void Promise.all([
      fetch('/api/dashboard/stats').then((r) => r.json()),
      fetch('/api/dashboard/conversations?limit=5').then((r) => r.json()),
      fetch('/api/dashboard/appointments?status=confirmed').then((r) => r.json()),
    ]).then(([s, c, a]) => {
      if (!s.error) setStats(s)
      setRecentConvs(c.conversations ?? [])
      setUpcomingAppts((a.appointments ?? []).slice(0, 3))
    })
  }, [])

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(['conv', 'appt', 'escalated', 'usage'] as const).map((k) => <Skeleton key={k} className="h-28 w-full" />)}
      </div>
    )
  }

  const usagePct = stats.aiRequestsLimit === 0 ? 0 : Math.min(100, (stats.aiRequestsUsed / stats.aiRequestsLimit) * 100)
  const usageColor = usagePct > 90 ? 'text-red-600' : usagePct > 70 ? 'text-amber-600' : 'text-emerald-600'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inicio</h1>
        <p className="text-muted-foreground">Resumen de tu actividad este mes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Conversaciones" value={stats.conversationsThisMonth} />
        <StatCard label="Citas creadas" value={stats.appointmentsThisMonth} />
        <StatCard label="Escalados" value={stats.escalatedCount} highlight={stats.escalatedCount > 0} />
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Solicitudes IA usadas</CardDescription>
            <CardTitle className={`text-2xl ${usageColor}`}>
              {stats.aiRequestsUsed} <span className="text-muted-foreground text-base font-normal">/ {stats.aiRequestsLimit}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={usagePct} className="h-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estado de WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${stats.whatsappConnected ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
            <span className="text-sm font-medium">
              {stats.whatsappConnected ? 'Twilio Conectado' : 'No configurado'}
            </span>
          </div>
          {stats.twilioWhatsappNumber && (
            <span className="text-sm text-muted-foreground">{stats.twilioWhatsappNumber}</span>
          )}
          <Link href="/dashboard/settings?tab=whatsapp" className="text-sm underline text-primary">
            Gestionar conexión →
          </Link>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversaciones recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentConvs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún sin actividad.</p>
            ) : (
              <ul className="divide-y">
                {recentConvs.map((c) => (
                  <li key={c.id} className="py-3 flex items-center justify-between">
                    <Link href={`/dashboard/conversations/${c.id}`} className="hover:underline">
                      {c.customer_phone}
                    </Link>
                    <Badge variant={c.status === 'escalated' ? 'destructive' : 'secondary'}>{c.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximas citas</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAppts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay citas próximas.</p>
            ) : (
              <ul className="divide-y">
                {upcomingAppts.map((a) => (
                  <li key={a.id} className="py-3">
                    <p className="font-medium">{a.customer_name ?? a.customer_phone}</p>
                    <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                      {dateFormatter(a.scheduled_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={`text-3xl ${highlight ? 'text-amber-600' : ''}`}>{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}
