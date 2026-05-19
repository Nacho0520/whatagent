'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2, Pencil } from 'lucide-react'

interface Service {
  id: string
  name: string
  description: string | null
  price_cents: number | null
  duration_minutes: number | null
  is_active: boolean
}

export default function ServicesPage() {
  const [items, setItems] = useState<Service[]>([])
  const [editing, setEditing] = useState<Partial<Service> | null>(null)
  const [open, setOpen] = useState(false)

  const load = async () => {
    const res = await fetch('/api/dashboard/services')
    const data = await res.json()
    setItems(data.services ?? [])
  }
  useEffect(() => { void load() }, [])

  const startNew = () => { setEditing({ name: '', description: '', price_cents: null, duration_minutes: 60, is_active: true }); setOpen(true) }
  const startEdit = (s: Service) => { setEditing(s); setOpen(true) }

  const save = async () => {
    if (!editing?.name) return
    const payload = {
      name: editing.name,
      description: editing.description ?? null,
      price_cents: editing.price_cents ?? null,
      duration_minutes: editing.duration_minutes ?? null,
      is_active: editing.is_active ?? true,
    }
    const url = editing.id ? `/api/dashboard/services/${editing.id}` : '/api/dashboard/services'
    const method = editing.id ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) { toast.error('Error'); return }
    toast.success('Guardado')
    setOpen(false)
    setEditing(null)
    void load()
  }

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este servicio?')) return
    await fetch(`/api/dashboard/services/${id}`, { method: 'DELETE' })
    void load()
  }

  const toggle = async (s: Service) => {
    await fetch(`/api/dashboard/services/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !s.is_active }),
    })
    void load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Servicios</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button onClick={startNew} />}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo servicio
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing?.id ? 'Editar' : 'Nuevo'} servicio</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input value={editing?.name ?? ''} onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Input value={editing?.description ?? ''} onChange={(e) => setEditing((s) => ({ ...s, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Precio (€)</Label>
                  <Input
                    type="number"
                    value={editing?.price_cents == null ? '' : (editing.price_cents / 100).toString()}
                    onChange={(e) => setEditing((s) => ({ ...s, price_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Duración (min)</Label>
                  <Input
                    type="number"
                    value={editing?.duration_minutes ?? ''}
                    onChange={(e) => setEditing((s) => ({ ...s, duration_minutes: e.target.value ? parseInt(e.target.value, 10) : null }))}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing((s) => ({ ...s, is_active: v }))} id="active" />
                <Label htmlFor="active">Activo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card className="p-6 text-muted-foreground">Aún no tienes servicios.</Card>
      ) : (
        <Card>
          <ul className="divide-y">
            {items.map((s) => (
              <li key={s.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium">{s.name}{!s.is_active && <span className="ml-2 text-xs text-muted-foreground">(inactivo)</span>}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.price_cents != null ? `${(s.price_cents / 100).toFixed(2)} €` : 'Sin precio'} · {s.duration_minutes ?? '?'} min
                  </p>
                  {s.description && <p className="text-sm mt-1">{s.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={s.is_active} onCheckedChange={() => toggle(s)} />
                  <Button variant="ghost" size="icon" onClick={() => startEdit(s)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(s.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
