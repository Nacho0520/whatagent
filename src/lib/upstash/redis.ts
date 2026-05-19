import { Redis } from '@upstash/redis'
import type { PendingSlot } from '@/types/database'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export interface ConversationCacheState {
  pendingSlots?: PendingSlot[]
  pendingServiceId?: string | null
  lastIntent?: string
  updatedAt?: number
}

export const conversationStateKey = (businessId: string, customerPhone: string) =>
  `conv_state:${businessId}:${customerPhone}`

export async function getConversationState(
  businessId: string,
  customerPhone: string
): Promise<ConversationCacheState | null> {
  return redis.get<ConversationCacheState>(conversationStateKey(businessId, customerPhone))
}

export async function setConversationState(
  businessId: string,
  customerPhone: string,
  state: ConversationCacheState,
  ttlSeconds = 600
) {
  return redis.set(conversationStateKey(businessId, customerPhone), state, { ex: ttlSeconds })
}

export async function clearConversationState(businessId: string, customerPhone: string) {
  return redis.del(conversationStateKey(businessId, customerPhone))
}

// Rate limiting helper for WhatsApp warming protocol
export const warmingLimitsPerTier: Record<number, number> = {
  1: 250,
  2: 1000,
  3: 10000,
}

export async function getDailyMessageCount(businessId: string): Promise<number> {
  const key = `daily_msgs:${businessId}:${new Date().toISOString().split('T')[0]}`
  const count = await redis.get<number>(key)
  return count ?? 0
}

export async function incrementDailyMessageCount(businessId: string): Promise<number> {
  const key = `daily_msgs:${businessId}:${new Date().toISOString().split('T')[0]}`
  const count = await redis.incr(key)
  await redis.expire(key, 90000)
  return count
}

// Deduplication helper (in addition to DB-level meta_message_id uniqueness)
export async function isDuplicateMessage(metaMessageId: string): Promise<boolean> {
  const key = `dedup:${metaMessageId}`
  const result = await redis.set(key, 1, { nx: true, ex: 86400 })
  return result === null
}
