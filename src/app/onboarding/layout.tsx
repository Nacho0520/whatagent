import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Configuración — WhatAgent',
  robots: { index: false, follow: false },
}
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const STEPS = [
  { key: 1, label: 'Negocio', href: '/onboarding' },
  { key: 2, label: 'WhatsApp', href: '/onboarding/whatsapp' },
  { key: 3, label: 'Agente IA', href: '/onboarding/agent' },
  { key: 4, label: 'Calendario', href: '/onboarding/calendar' },
  { key: 5, label: 'Activar', href: '/onboarding/activate' },
]

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('onboarding_step, onboarding_completed')
    .eq('owner_id', user.id)
    .maybeSingle()

  const currentStep = business?.onboarding_step ?? 1

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900">
        <div className="max-w-5xl mx-auto p-4 flex justify-between items-center">
          <Link href="/" className="text-lg font-bold">WhatAgent</Link>
          <span className="text-sm text-muted-foreground">Configuración inicial</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <ol className="flex items-center justify-between mb-10">
          {STEPS.map((step, idx) => {
            const isDone = currentStep > step.key
            const isCurrent = currentStep === step.key
            return (
              <li key={step.key} className="flex-1 flex items-center">
                <div className="flex flex-col items-center text-center flex-shrink-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-slate-200 text-slate-500 dark:bg-slate-800'
                    }`}
                  >
                    {isDone ? '✓' : step.key}
                  </div>
                  <span className="text-xs mt-2 text-muted-foreground hidden sm:block">{step.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${isDone ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'}`} />
                )}
              </li>
            )
          })}
        </ol>

        <main className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 md:p-10">{children}</main>
      </div>
    </div>
  )
}
