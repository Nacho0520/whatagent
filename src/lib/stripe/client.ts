import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  _stripe = new Stripe(key, { typescript: true })
  return _stripe
}

/**
 * Proxy that lazy-initializes the underlying Stripe client only when accessed.
 * Avoids construction failures at module-eval time during builds.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripe()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop as string]
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value
  },
})
