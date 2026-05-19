export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">WhatAgent</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tu recepcionista de WhatsApp con IA
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
