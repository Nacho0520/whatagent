import { stripe } from './client'
import type { BusinessPlan } from '@/types/database'

export interface PlanDescriptor {
  plan: BusinessPlan
  displayName: string
  priceEuros: number
  monthlyConversationLimit: number
  maxPhoneNumbers: number
  hasFollowUps: boolean
  hasReminders: boolean
  hasReviewRequests: boolean
  hasKnowledgeBase: boolean
  /** Set this from env or DB after creating products in Stripe */
  stripePriceId?: string
}

export const PLANS: Record<BusinessPlan, PlanDescriptor> = {
  trial: {
    plan: 'trial',
    displayName: 'Prueba Gratuita',
    priceEuros: 0,
    monthlyConversationLimit: 50,
    maxPhoneNumbers: 1,
    hasFollowUps: false,
    hasReminders: false,
    hasReviewRequests: false,
    hasKnowledgeBase: false,
  },
  starter: {
    plan: 'starter',
    displayName: 'Plan Inicio',
    priceEuros: 79,
    monthlyConversationLimit: 500,
    maxPhoneNumbers: 1,
    hasFollowUps: false,
    hasReminders: true,
    hasReviewRequests: false,
    hasKnowledgeBase: false,
    stripePriceId: process.env.STRIPE_PRICE_STARTER,
  },
  business: {
    plan: 'business',
    displayName: 'Plan Negocio',
    priceEuros: 149,
    monthlyConversationLimit: 2000,
    maxPhoneNumbers: 3,
    hasFollowUps: true,
    hasReminders: true,
    hasReviewRequests: true,
    hasKnowledgeBase: true,
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS,
  },
  agency: {
    plan: 'agency',
    displayName: 'Plan Agencia',
    priceEuros: 299,
    monthlyConversationLimit: 999_999,
    maxPhoneNumbers: 10,
    hasFollowUps: true,
    hasReminders: true,
    hasReviewRequests: true,
    hasKnowledgeBase: true,
    stripePriceId: process.env.STRIPE_PRICE_AGENCY,
  },
}

export function getPlanLimits(plan: BusinessPlan): PlanDescriptor {
  return PLANS[plan]
}

export async function createCheckoutSession(args: {
  businessId: string
  customerEmail: string
  customerId?: string
  priceId: string
  successUrl: string
  cancelUrl: string
}) {
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: args.customerId,
    customer_email: args.customerId ? undefined : args.customerEmail,
    line_items: [{ price: args.priceId, quantity: 1 }],
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    metadata: { businessId: args.businessId },
    subscription_data: {
      metadata: { businessId: args.businessId },
    },
  })
}

export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

export function planFromPriceId(priceId: string | null | undefined): BusinessPlan | null {
  if (!priceId) return null
  for (const [planKey, descriptor] of Object.entries(PLANS)) {
    if (descriptor.stripePriceId === priceId) return planKey as BusinessPlan
  }
  return null
}
