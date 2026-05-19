import OpenAI from 'openai'
import type { AgentResponse, ConversationContext } from '@/types/ai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const GENERATOR_MODEL = 'gpt-4o'
const MAX_HISTORY = 6

const SAFE_FALLBACK =
  'Disculpa, estoy teniendo dificultades técnicas en este momento. Un miembro de nuestro equipo te contactará en breve para ayudarte.'

export async function generateResponse(
  systemPrompt: string,
  conversationHistory: ConversationContext,
  currentMessage: string
): Promise<AgentResponse> {
  try {
    const history = conversationHistory.slice(-MAX_HISTORY)

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: currentMessage },
    ]

    const response = await openai.chat.completions.create({
      model: GENERATOR_MODEL,
      max_tokens: 600,
      messages,
    })

    const content = response.choices[0].message.content?.trim() ?? SAFE_FALLBACK

    return {
      content,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      model: GENERATOR_MODEL,
    }
  } catch (error) {
    console.error('[Generator] Error', { error: error instanceof Error ? error.message : error })
    return { content: SAFE_FALLBACK, model: GENERATOR_MODEL }
  }
}
