'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Appointment {
  id: string
  customer_phone: string
  customer_name: string | null
  scheduled_at: string
  duration_minutes: number | null
  status: string
  services?: { name: string } | null
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  confirmed: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
  no_show: 'destructive',
  rescheduled: 'outline',
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No show',
  rescheduled: 'Reprogramada',
}

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([])
  const dateFormatter = useSyncExternalStore(
    () => () => {},
    () => (date: string) => new Date(date).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }),
    () => () => ''
  )

  useEffect(() => {
    void fetch('/api/dashboard/appointments').then((r) => r.json()).then((d) => setItems(d.appointments ?? []))
  }, [])

  const now = Date.now()
  const upcoming = items.filter((a) => new Date(a.scheduled_at).getTime() > now)
  const past = items.filter((a) => new Date(a.scheduled_at).getTime() <= now)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Citas</h1>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Próximas ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Pasadas ({past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <List items={upcoming} dateFormatter={dateFormatter} />
        </TabsContent>
        <TabsContent value="past">
          <List items={past} dateFormatter={dateFormatter} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function List({ items, dateFormatter }: { items: Appointment[]; dateFormatter: (date: string) => string }) {
  if (items.length === 0) return <Card className="p-6 text-muted-foreground">Sin citas.</Card>
  return (
    <Card>
      <ul className="divide-y">
        {items.map((a) => (
          <li key={a.id} className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{a.customer_name ?? a.customer_phone}</p>
              <p className="text-xs text-muted-foreground">
                {a.services?.name ?? 'Servicio sin asignar'} · {a.duration_minutes ?? 60} min
              </p>
            </div>
            <div className="text-right">
              <Badge variant={STATUS_VARIANT[a.status] ?? 'secondary'} className="mb-1">
                {STATUS_LABEL[a.status] ?? a.status}
              </Badge>
              <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                {dateFormatter(a.scheduled_at)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
