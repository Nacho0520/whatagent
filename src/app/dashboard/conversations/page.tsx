'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Conv {
  id: string
  customer_phone: string
  customer_name: string | null
  status: string
  last_message_at: string
  total_messages: number
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activa',
  resolved: 'Resuelta',
  escalated: 'Escalada',
  waiting_human: 'Esperando humano',
}

export default function ConversationsPage() {
  const [items, setItems] = useState<Conv[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const dateFormatter = useSyncExternalStore(
    () => () => {},
    () => (date: string) => new Date(date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
    () => () => ''
  )

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    void fetch(`/api/dashboard/conversations?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setItems(d.conversations ?? [])
        setLoading(false)
      })
  }, [status])

  const filtered = items.filter((it) =>
    !query || it.customer_phone.includes(query) || (it.customer_name?.toLowerCase().includes(query.toLowerCase()) ?? false)
  )

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Conversaciones</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Buscar por nombre o teléfono…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm" />
        <Select value={status} onValueChange={(v) => setStatus(v ?? 'all')}>
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="resolved">Resueltas</SelectItem>
            <SelectItem value="escalated">Escaladas</SelectItem>
            <SelectItem value="waiting_human">Esperando humano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        {loading ? (
          <div className="p-6 text-muted-foreground">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-muted-foreground">No hay conversaciones.</div>
        ) : (
          <ul className="divide-y">
            {filtered.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/conversations/${c.id}`}
                  className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{c.customer_name ?? c.customer_phone}</p>
                      <p className="text-xs text-muted-foreground">{c.customer_phone} · {c.total_messages} mensajes</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={c.status === 'escalated' ? 'destructive' : 'secondary'} className="mb-1">
                        {STATUS_LABEL[c.status] ?? c.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                        {dateFormatter(c.last_message_at)}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
