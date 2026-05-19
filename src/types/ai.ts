export type Intent =
  | 'BOOK_APPOINTMENT'
  | 'APPOINTMENT_SELECTION'
  | 'CANCEL_APPOINTMENT'
  | 'RESCHEDULE_APPOINTMENT'
  | 'FAQ_HOURS'
  | 'FAQ_PRICE'
  | 'FAQ_SERVICES'
  | 'FAQ_LOCATION'
  | 'GENERAL_INQUIRY'
  | 'COMPLAINT'
  | 'GREETING'
  | 'OUT_OF_SCOPE'
  | 'CONFIRMATION'

export interface ClassificationResult {
  intent: Intent
  confidence: number
  requiresLLM: boolean
  requiresCalendar: boolean
  requiresEscalation: boolean
  /** For APPOINTMENT_SELECTION: which slot (1, 2, 3) */
  selectedSlotIndex?: number
  /** Service name they mentioned, if any */
  serviceMention?: string
  /** Token usage from the classifier itself */
  inputTokens?: number
  outputTokens?: number
}

export interface AgentResponse {
  content: string
  appointmentBooked?: boolean
  escalated?: boolean
  inputTokens?: number
  outputTokens?: number
  model?: string
}

export interface ConversationContextMessage {
  role: 'user' | 'assistant'
  content: string
}

export type ConversationContext = ConversationContextMessage[]
