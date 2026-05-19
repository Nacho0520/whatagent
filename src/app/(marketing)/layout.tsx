import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <header className="border-b sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">WhatAgent</Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground">Características</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground">Precios</a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" render={<Link href="/login" />}>Login</Button>
            <Button size="sm" render={<Link href="/register" />}>Empezar gratis</Button>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t mt-20">
        <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-muted-foreground flex flex-col md:flex-row justify-between gap-3">
          <p suppressHydrationWarning>© {new Date().getFullYear()} WhatAgent</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">Privacidad</Link>
            <Link href="/terms" className="hover:text-foreground">Términos</Link>
            <a href="mailto:hola@whatagent.app" className="hover:text-foreground">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
