import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'WhatAgent — Recepcionista IA para WhatsApp',
  description: 'Automatiza tu WhatsApp Business con inteligencia artificial. Responde clientes, agenda citas y gestiona tu negocio 24/7.',
}
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Calendar, TrendingUp, BarChart3, Check, Sparkles } from 'lucide-react'

const FEATURES = [
  { icon: MessageCircle, title: 'Responde 24/7', body: 'Tu IA conversa con clientes en cualquier momento, incluso fuera de horario.' },
  { icon: Calendar, title: 'Agenda citas solo', body: 'Lee tu Google Calendar, ofrece huecos disponibles y crea el evento.' },
  { icon: TrendingUp, title: 'Recupera leads', body: 'Hace follow-up automático a clientes que no completaron la reserva.' },
  { icon: BarChart3, title: 'Estadísticas claras', body: 'Mide conversiones, costes y satisfacción desde un panel sencillo.' },
]

const FAQ = [
  { q: '¿Necesito una cuenta de WhatsApp Business?', a: 'Sí, necesitas un número de WhatsApp Business. Te ayudamos a conectarlo vía Twilio paso a paso durante el onboarding.' },
  { q: '¿La IA puede inventar precios o información?', a: 'No. El agente está restringido a la información que tú configures. Si no sabe algo, escalará a un humano.' },
  { q: '¿Cuánto tarda en estar listo?', a: 'Menos de 30 minutos. El onboarding tiene 5 pasos y la mayoría se completa en una sentada.' },
  { q: '¿Qué pasa si llegas al límite de tu plan?', a: 'Te avisamos al 80% para que decidas si actualizar. Si superas el límite, la IA se pausa hasta el siguiente ciclo.' },
  { q: '¿Mis datos están seguros?', a: 'Hosting en EU, encriptación en reposo, RLS por tenant en Supabase. Cumplimos GDPR.' },
  { q: '¿Puedo cancelar cuando quiera?', a: 'Sí, sin permanencia. Cancela en un click desde el panel de facturación.' },
]

const PLANS = [
  { key: 'starter', name: 'Inicio', price: '79€', features: ['500 conversaciones/mes', '1 número WhatsApp', 'Recordatorios de citas', 'Panel completo'] },
  { key: 'business', name: 'Negocio', price: '149€', features: ['2.000 conversaciones/mes', '3 números WhatsApp', 'Follow-ups automáticos', 'Solicitud de reseñas', 'Base de conocimiento'], highlight: true },
  { key: 'agency', name: 'Agencia', price: '299€', features: ['Conversaciones ilimitadas', '10 números WhatsApp', 'Todo incluido', 'Soporte prioritario'] },
]

export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-emerald-950/30 dark:via-slate-950 dark:to-blue-950/30" />
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-32 text-center">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="w-3 h-3 mr-1" /> Powered by OpenAI
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Tu recepcionista de<br />
            <span className="text-emerald-600">WhatsApp con IA</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Atiende, reserva citas y recupera leads en WhatsApp automáticamente. Para PYMEs que no quieren perder clientes por no responder a tiempo.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" render={<Link href="/register" />}>Empezar gratis 14 días</Button>
            <Button size="lg" variant="outline" render={<a href="#pricing" />}>Ver precios</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">Sin tarjeta de crédito. Sin permanencia.</p>
        </div>
      </section>

      {/* Problem */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">El 60% de los mensajes a un negocio se reciben fuera del horario laboral.</h2>
          <p className="text-lg text-muted-foreground">
            Cada mensaje sin responder es un cliente perdido, una cita no reservada y una recomendación que no recibirás. Con WhatAgent, tu negocio responde al instante, 24/7, sin coste adicional por mensaje extra.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Todo lo que necesitas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <Card key={f.title}>
                  <CardHeader>
                    <Icon className="w-8 h-8 text-emerald-600 mb-2" />
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{f.body}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-12">En 3 pasos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: 1, t: 'Conecta WhatsApp', d: 'Vincula tu número de WhatsApp Business en minutos vía Twilio.' },
              { n: 2, t: 'Configura el agente', d: 'Cuéntale a la IA sobre tu negocio, servicios y horarios.' },
              { n: 3, t: 'Activa', d: 'Empieza a recibir mensajes. La IA responde y reserva sola.' },
            ].map((s) => (
              <div key={s.n}>
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">{s.n}</div>
                <h3 className="font-semibold mb-1">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Precios simples</h2>
            <p className="text-muted-foreground">Empieza gratis. Escala cuando crezcas.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((p) => (
              <Card key={p.key} className={p.highlight ? 'border-primary shadow-lg relative' : ''}>
                {p.highlight && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Más popular</Badge>
                )}
                <CardHeader>
                  <CardTitle>{p.name}</CardTitle>
                  <CardDescription className="text-3xl font-bold text-foreground">{p.price}<span className="text-sm font-normal text-muted-foreground">/mes</span></CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Button variant={p.highlight ? 'default' : 'outline'} className="w-full" render={<Link href="/register" />}>
                    Empezar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="group border rounded-lg p-4 bg-white dark:bg-slate-900">
                <summary className="font-medium cursor-pointer flex justify-between items-center">
                  {item.q}
                  <span className="text-muted-foreground group-open:rotate-180 transition">▾</span>
                </summary>
                <p className="text-sm text-muted-foreground mt-3">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Empieza hoy. Atiende mañana.</h2>
          <p className="text-lg text-muted-foreground mb-8">14 días gratis. Sin tarjeta. Cancela cuando quieras.</p>
          <Button size="lg" render={<Link href="/register" />}>Crear mi cuenta</Button>
        </div>
      </section>
    </main>
  )
}
