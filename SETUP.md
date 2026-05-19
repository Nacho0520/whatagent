# WhatAgent — Guía de configuración

WhatAgent es un SaaS multi-tenant que conecta WhatsApp Business con un agente IA para PYMEs.
Esta guía te lleva paso a paso desde un repo recién clonado hasta un primer mensaje real respondido por la IA.

> ⏱ Tiempo total estimado: ~45 min (excluyendo aprobación de Meta App si necesitas Embedded Signup).

---

## 1. Prerequisitos locales

- Node.js 20+ (`nvm install 20 && nvm use 20`)
- pnpm 10+ (`npm install -g pnpm`)
- Git
- Cuenta en: Supabase, Anthropic, Upstash, Stripe, Resend, Google Cloud, Meta Developers

```bash
node --version   # debe ser >= 20
pnpm --version
git --version
```

## 2. Instalar dependencias

```bash
cd whatagent
pnpm install
```

## 3. Variables de entorno

El proyecto incluye `.env.local` con todas las claves vacías. Ve completándolas en cada paso.

---

## 4. Supabase (DB + Auth)

1. Crea proyecto en [supabase.com](https://supabase.com) (recomendado plan Pro, región EU para GDPR).
2. En **Settings → API**, copia a `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Ejecuta las migraciones en **SQL Editor**, en orden:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_stripe_plans.sql`
4. En **Authentication → Providers**, activa **Email** (con confirmación si lo deseas).
5. En **Authentication → URL Configuration**, añade:
   - Site URL: `http://localhost:3000` (más tarde, dominio prod)
   - Redirect URLs: `http://localhost:3000/auth/callback`

---

## 5. Anthropic

1. Crea cuenta en [console.anthropic.com](https://console.anthropic.com).
2. Genera una API key.
3. Añade a `.env.local`: `ANTHROPIC_API_KEY=sk-ant-...`

Modelos usados:
- `claude-haiku-4-5-20251001` — clasificación de intents (barato y rápido)
- `claude-sonnet-4-6` — generación de respuestas

---

## 6. Upstash (Redis + QStash)

1. Crea cuenta en [upstash.com](https://upstash.com).
2. **Redis**: crea base de datos (Free tier, región EU). Copia REST URL y Token.
3. **QStash**: ve a la sección QStash. Copia:
   - Token
   - Current Signing Key
   - Next Signing Key
4. Añade todo a `.env.local` (`UPSTASH_REDIS_REST_*`, `QSTASH_*`).

---

## 7. Meta / WhatsApp Cloud API

1. [developers.facebook.com](https://developers.facebook.com) → crea cuenta de desarrollador.
2. **Create App** → tipo **Business**.
3. Añade el producto **WhatsApp**.
4. En **WhatsApp → API Setup**:
   - Copia el **temporary access token** (válido 24h, para pruebas).
   - Copia el **phone number ID**.
   - Añade tu número personal como **destinatario de pruebas**.
5. En **App Settings → Basic**:
   - Copia **App ID** → `META_APP_ID` en `.env.local`.
   - Copia **App Secret** → `META_APP_SECRET`.
6. En **WhatsApp → Configuration → Webhooks**:
   - Crea un **Verify Token** (cualquier string aleatorio). Cópialo a `META_WEBHOOK_VERIFY_TOKEN`.
   - Más adelante (paso 12) configurarás la URL del webhook con tu túnel o dominio.
   - Suscríbete a los campos: **messages**, **message_deliveries**.

> Para producción multi-tenant, necesitas pedir **Embedded Signup** (Tech Provider review). En desarrollo, usa el modo manual del onboarding.

---

## 8. Stripe

1. Crea cuenta en [stripe.com](https://stripe.com) (modo **Test** durante desarrollo).
2. En **Developers → API keys**, copia:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
3. Crea 3 productos con sus prices recurrentes mensuales:
   - **Plan Inicio** — 79 EUR/mes
   - **Plan Negocio** — 149 EUR/mes
   - **Plan Agencia** — 299 EUR/mes
4. Copia cada `price_...` y añádelo a `.env.local`:
   ```
   STRIPE_PRICE_STARTER=price_...
   STRIPE_PRICE_BUSINESS=price_...
   STRIPE_PRICE_AGENCY=price_...
   ```
5. En **Developers → Webhooks**, añade endpoint `https://TU-DOMINIO/api/webhooks/stripe` (más tarde con dominio real) y suscribe:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
6. Copia el **Signing secret** → `STRIPE_WEBHOOK_SECRET`.

---

## 9. Resend (Emails)

1. Crea cuenta en [resend.com](https://resend.com).
2. Para desarrollo puedes usar `onboarding@resend.dev` (no requiere dominio).
3. Para producción, verifica tu dominio.
4. Genera API key → `RESEND_API_KEY`.
5. (Opcional) `RESEND_FROM_EMAIL=hola@tudominio.com`.

---

## 10. Google Cloud (Calendar API)

1. Crea proyecto en [console.cloud.google.com](https://console.cloud.google.com).
2. **APIs & Services → Library**: activa **Google Calendar API**.
3. **APIs & Services → Credentials** → **Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized redirect URIs:
     - `http://localhost:3000/api/onboarding/connect-calendar`
     - Tu URL de producción (más adelante).
4. Copia Client ID + Secret a `.env.local`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/onboarding/connect-calendar
   ```
5. En **OAuth consent screen**, configura datos básicos y añade los scopes:
   - `.../auth/calendar`
   - `.../auth/calendar.events`
6. Mientras el app esté en modo **Testing**, añade tu email como **Test user**.

---

## 11. Arranca en local

```bash
pnpm dev
```

Visita `http://localhost:3000` — debería cargar la landing.

## 12. Exponer localhost a Meta y Stripe

Meta y Stripe necesitan llegar a tu webhook. Usa Cloudflare Tunnel:

```bash
npx cloudflared tunnel --url http://localhost:3000
```

Copia la URL HTTPS generada (ej. `https://random-name.trycloudflare.com`):

1. Actualiza `NEXT_PUBLIC_APP_URL` en `.env.local`.
2. En **Meta → WhatsApp → Webhooks**, configura URL = `https://TUNNEL/api/webhook/whatsapp` con tu Verify Token.
3. En **Stripe → Webhooks**, edita la URL al túnel.
4. Reinicia `pnpm dev` para que coja el nuevo `NEXT_PUBLIC_APP_URL`.

## 13. Probar end-to-end

1. Ve a `/register`, crea cuenta.
2. Completa los 5 pasos del onboarding:
   - Datos del negocio
   - WhatsApp → modo **Manual**: pega el temporary token + phone number ID
   - Configura el agente (nombre, contexto, servicios)
   - Conecta Google Calendar (OAuth)
   - Activa con **prueba gratuita** (no necesita Stripe para empezar)
3. Desde tu móvil personal (registrado como tester en Meta), envía un WhatsApp al número de WhatsApp Business.
4. En unos segundos deberías ver la respuesta de la IA.
5. Comprueba en `/dashboard/conversations` que aparece la conversación.

---

## 14. Deploy a Vercel

```bash
npx vercel --prod
```

1. Añade **todas** las variables de `.env.local` a **Vercel → Project → Settings → Environment Variables**.
2. Actualiza:
   - `NEXT_PUBLIC_APP_URL` a tu dominio real.
   - URLs de webhook en Meta y Stripe.
   - `GOOGLE_OAUTH_REDIRECT_URI` a tu dominio (y añade esa URI a Google Cloud OAuth).
3. Para el daily quality-check, programa en QStash una **Schedule** que haga POST a:
   `https://TU-DOMINIO/api/worker/quality-check` cada día.

---

## 15. Checklist de producción

- [ ] Migraciones aplicadas en Supabase prod
- [ ] Todas las vars en Vercel
- [ ] Webhook de Meta verificado y suscrito a `messages`
- [ ] Webhook de Stripe verificado
- [ ] Cron diario de quality-check creado en QStash
- [ ] Plantillas de WhatsApp aprobadas: `appointment_reminder`, `follow_up`
- [ ] Embedded Signup aprobado (si haces multi-tenant en prod)
- [ ] DNS / dominio configurado

---

## TODOs y áreas que requieren configuración manual

1. **Plantillas de WhatsApp**: las plantillas `appointment_reminder` y `follow_up` deben crearse y aprobarse en **WhatsApp Manager → Message Templates** en español. El código las usa por nombre.
2. **Embedded Signup**: requiere review de Meta como Tech Provider. Mientras tanto, el modo manual funciona.
3. **Plantillas de email**: en `src/lib/resend/client.ts` las plantillas son HTML inline. Para mejor experiencia, considera React Email.
4. **Encryption at rest** para `meta_access_token`: por defecto se guarda en texto plano en la DB. Para producción, usa Supabase Vault.
5. **`is_within_csw`**: PostgreSQL no permite columnas GENERATED STORED con funciones volátiles, así que el cálculo se hace en código (`isWithinCSW()` en `lib/whatsapp/client.ts`).
6. **Stripe API version**: el SDK usa la versión por defecto de tu cuenta. Si quieres pinearla, edita `src/lib/stripe/client.ts`.
