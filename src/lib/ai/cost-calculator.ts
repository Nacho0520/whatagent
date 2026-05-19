// Pricing per 1M tokens in USD (microcents = USD * 1e8)
// Verify against https://www.anthropic.com/pricing#anthropic-api
const PRICING = {
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  // Fallback / generic
  'claude-haiku': { input: 1, output: 5 },
  'claude-sonnet': { input: 3, output: 15 },
} as const

const EUR_PER_USD = 0.92

export function calculateAnthropicCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  const key = (Object.keys(PRICING) as Array<keyof typeof PRICING>).find((k) => model.includes(k.replace(/^claude-/, ''))) ?? 'claude-haiku'
  const rates = PRICING[key]
  const usd = (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output
  const eur = usd * EUR_PER_USD
  // microcents = cents * 100; 1 EUR = 10000 microcents
  return Math.round(eur * 10000)
}

export function formatCostForDisplay(microcents: number): string {
  const euros = microcents / 10000
  return `€${euros.toFixed(4)}`
}

export function sumTokens(messages: Array<{ input_tokens: number; output_tokens: number }>) {
  return messages.reduce(
    (acc, m) => ({
      input: acc.input + (m.input_tokens ?? 0),
      output: acc.output + (m.output_tokens ?? 0),
    }),
    { input: 0, output: 0 }
  )
}
