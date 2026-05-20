import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/dashboard-sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, plan, plan_status, onboarding_completed')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!business) redirect('/onboarding')
  if (!business.onboarding_completed) redirect('/onboarding')

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <DashboardSidebar businessName={business.name} plan={business.plan} />

      <div className="flex-1 flex flex-col md:ml-64">
        <header className="bg-white dark:bg-slate-900 border-b px-6 py-3 flex items-center justify-between">
          <div className="md:hidden">
            <Link href="/dashboard" className="font-bold">WhatAgent</Link>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
            <form action="/api/auth/signout" method="post">
              <button className="text-sm text-muted-foreground hover:text-foreground" type="submit">
                Cerrar sesión
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
