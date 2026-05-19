import Anthropic from '@anthropic-ai/sdk'
import type { AgentResponse, ConversationContext } from '@/types/ai'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const GENERATOR_MODEL = 'claude-sonnet-4-6'
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

    const messages = [
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: currentMessage },
    ]

    const response = await anthropic.messages.create({
      model: GENERATOR_MODEL,
      max_tokens: 600,
      system: systemPrompt,
      messages,
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const content = textBlock?.type === 'text' ? textBlock.text.trim() : SAFE_FALLBACK

    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: GENERATOR_MODEL,
    }
  } catch (error) {
    console.error('[Generator] Error', { error: error instanceof Error ? error.message : error })
    return { content: SAFE_FALLBACK, model: GENERATOR_MODEL }
  }
}
