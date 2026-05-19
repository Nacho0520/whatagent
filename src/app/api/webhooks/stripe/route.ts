import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { planFromPriceId, PLANS } from '@/lib/stripe/plans'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/resend/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !secret) {
    return new NextResponse('Missing signature', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (error) {
    console.error('[Stripe] Webhook signature invalid', { error })
    return new NextResponse('Bad signature', { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const businessId = session.metadata?.businessId
        if (!businessId) break
        await supabase
          .from('businesses')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            plan_status: 'active',
          })
          .eq('id', businessId)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        await supabase
          .from('businesses')
          .update({
            ai_requests_this_month: 0,
            template_messages_this_month: 0,
            billing_cycle_start: new Date().toISOString(),
            plan_status: 'active',
          })
          .eq('stripe_customer_id', customerId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const { data: biz } = await supabase
          .from('businesses')
          .update({ plan_status: 'past_due' })
          .eq('stripe_customer_id', customerId)
          .select('email, name')
          .maybeSingle()

        if (biz?.email) {
          await sendEmail({
            to: biz.email as string,
            subject: '[WhatAgent] Problema con tu pago',
            html: `<p>Hola,</p><p>No hemos podido cobrar tu suscripción de WhatAgent. Por favor, actualiza tu método de pago desde el panel de facturación.</p>`,
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await supabase
          .from('businesses')
          .update({
            plan: 'trial',
            plan_status: 'canceled',
            monthly_conversation_limit: 50,
          })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const priceId = sub.items.data[0]?.price.id
        const plan = planFromPriceId(priceId)
        if (plan) {
          await supabase
            .from('businesses')
            .update({
              plan,
              plan_status:
                sub.status === 'active'
                  ? 'active'
                  : sub.status === 'past_due'
                    ? 'past_due'
                    : sub.status === 'trialing'
                      ? 'trialing'
                      : 'canceled',
              monthly_conversation_limit: PLANS[plan].monthlyConversationLimit,
            })
            .eq('stripe_subscription_id', sub.id)
        }
        break
      }

      default:
        // no-op
        break
    }
  } catch (error) {
    console.error('[Stripe] Webhook handler error', { type: event.type, error })
    return new NextResponse('Handler error', { status: 500 })
  }

  return NextResponse.json({ received: true })
}
