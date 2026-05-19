'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MessageCircle, Calendar, Settings, CreditCard, Briefcase, Menu, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/dashboard/conversations', label: 'Conversaciones', icon: MessageCircle },
  { href: '/dashboard/appointments', label: 'Citas', icon: Calendar },
  { href: '/dashboard/services', label: 'Servicios', icon: Briefcase },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
  { href: '/dashboard/billing', label: 'Facturación', icon: CreditCard },
]

const PLAN_LABEL: Record<string, string> = {
  trial: 'Prueba',
  starter: 'Inicio',
  business: 'Negocio',
  agency: 'Agencia',
}

export function DashboardSidebar({ businessName, plan }: { businessName: string; plan: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-white dark:bg-slate-900 rounded border"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menú"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r flex flex-col transition-transform',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="p-6 border-b">
          <Link href="/dashboard" className="block">
            <p className="font-bold text-lg">WhatAgent</p>
            <p className="text-xs text-muted-foreground truncate">{businessName}</p>
          </Link>
          <Badge variant="outline" className="mt-2">Plan {PLAN_LABEL[plan] ?? plan}</Badge>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {ITEMS.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
