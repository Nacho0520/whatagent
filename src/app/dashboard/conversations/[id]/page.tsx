'use client'

import { useEffect, useState, use } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Conv {
  id: string
  customer_phone: string
  customer_name: string | null
  status: string
  total_messages: number
  ai_messages: number
  last_customer_message_at: string | null
}
interface Msg {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  intent_classified: string | null
  was_deterministic: boolean
  error_message: string | null
}

export default function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [conv, setConv] = useState<Conv | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => { setIsMounted(true) }, [])
  const dateFormatter = (date: string) =>
    isMounted ? new Date(date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : ''

  const load = async () => {
    const res = await fetch(`/api/dashboard/conversations/${id}`)
    if (!res.ok) return
    const { conversation, messages } = await res.json()
    setConv(conversation)
    setMessages(messages)
  }

  useEffect(() => {
    void load()
  }, [id])

  const updateStatus = async (status: string) => {
    const res = await fetch(`/api/dashboard/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast.success('Estado actualizado')
      void load()
    } else {
      toast.error('Error')
    }
  }

  const sendManual = async () => {
    if (!reply.trim()) return
    setSending(true)
    const res = await fetch('/api/dashboard/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: id, text: reply }),
    })
    setSending(false)
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error === 'outside_csw' ? 'Fuera de ventana de 24h. Usa una plantilla.' : err.error ?? 'Error')
      return
    }
    setReply('')
    toast.success('Mensaje enviado')
    void load()
  }

  if (!conv) return <p className="text-muted-foreground">Cargando…</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{conv.customer_name ?? conv.customer_phone}</h1>
          <p className="text-sm text-muted-foreground">{conv.customer_phone} · {conv.total_messages} mensajes</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={conv.status === 'escalated' ? 'destructive' : 'secondary'}>{conv.status}</Badge>
          <Select value={conv.status} onValueChange={(v) => v && updateStatus(v)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Marcar activa</SelectItem>
              <SelectItem value="resolved">Marcar resuelta</SelectItem>
              <SelectItem value="escalated">Marcar escalada</SelectItem>
              <SelectItem value="waiting_human">Esperando humano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-4 max-h-[60vh] overflow-y-auto">
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${m.role === 'user' ? 'bg-slate-100 dark:bg-slate-800' : 'bg-emerald-100 dark:bg-emerald-900/40'}`}>
                <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1" suppressHydrationWarning>
                  {dateFormatter(m.created_at)}
                  {m.intent_classified && ` · ${m.intent_classified}`}
                  {m.was_deterministic && ' · ⚡'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4 space-y-2">
        <label htmlFor="manual-reply" className="text-sm font-medium">Enviar mensaje manual</label>
        <Textarea
          id="manual-reply"
          rows={3}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Escribe un mensaje al cliente…"
        />
        <div className="flex justify-end">
          <Button onClick={sendManual} disabled={sending || !reply.trim()}>
            {sending ? 'Enviando…' : 'Enviar'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Solo disponible dentro de la ventana de 24h desde el último mensaje del cliente.
        </p>
      </Card>
    </div>
  )
}
