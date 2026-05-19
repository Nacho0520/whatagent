export type MessageRole = 'user' | 'assistant' | 'system'
export type ConversationStatus = 'active' | 'resolved' | 'escalated' | 'waiting_human'
export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'rescheduled'
export type BusinessPlan = 'trial' | 'starter' | 'business' | 'agency'
export type PlanStatus = 'active' | 'past_due' | 'canceled' | 'trialing'
export type AgentTone = 'formal' | 'professional' | 'friendly' | 'casual'
export type ScheduledJobType =
  | 'follow_up'
  | 'reminder_24h'
  | 'reminder_2h'
  | 'review_request'
export type ScheduledJobStatus = 'pending' | 'sent' | 'cancelled' | 'failed'

export interface Business {
  id: string
  owner_id: string

  name: string
  industry: string
  city: string | null
  phone: string | null
  email: string | null
  website: string | null

  twilio_account_sid: string | null
  twilio_auth_token: string | null
  twilio_whatsapp_number: string | null
  whatsapp_connected: boolean

  agent_name: string
  agent_persona: string
  business_context: string
  agent_tone: AgentTone
  escalation_phone: string | null
  escalation_email: string | null

  google_access_token: string | null
  google_refresh_token: string | null
  google_token_expiry: string | null
  google_calendar_id: string | null
  calendar_connected: boolean

  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: BusinessPlan
  plan_status: PlanStatus
  ai_requests_this_month: number
  template_messages_this_month: number
  billing_cycle_start: string
  trial_ends_at: string

  monthly_conversation_limit: number

  is_active: boolean
  onboarding_step: number
  onboarding_completed: boolean

  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  business_id: string
  name: string
  description: string | null
  category: string | null
  price_cents: number | null
  currency: string
  duration_minutes: number | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Conversation {
  id: string
  business_id: string
  customer_phone: string
  customer_name: string | null
  status: ConversationStatus

  last_customer_message_at: string | null
  csw_expires_at: string | null

  pending_appointment_slots: PendingSlot[] | null
  pending_service_id: string | null

  follow_up_sent: boolean
  follow_up_job_id: string | null

  total_messages: number
  ai_messages: number

  last_message_at: string
  created_at: string
  updated_at: string
}

export interface PendingSlot {
  index: number
  iso: string
  label: string
}

export interface Message {
  id: string
  conversation_id: string
  business_id: string

  role: MessageRole
  content: string

  twilio_message_sid: string | null

  intent_classified: string | null
  intent_confidence: number | null
  was_deterministic: boolean
  model_used: string | null
  input_tokens: number
  output_tokens: number
  cost_microcents: number

  processing_time_ms: number | null
  error_message: string | null

  created_at: string
}

export interface Appointment {
  id: string
  business_id: string
  conversation_id: string | null
  service_id: string | null

  customer_phone: string
  customer_name: string | null
  customer_notes: string | null

  scheduled_at: string
  duration_minutes: number | null
  google_event_id: string | null

  status: AppointmentStatus

  reminder_24h_sent: boolean
  reminder_2h_sent: boolean
  review_requested: boolean

  reminder_job_id: string | null
  review_job_id: string | null

  notes: string | null
  created_at: string
  updated_at: string
}

export interface ScheduledJob {
  id: string
  business_id: string
  job_type: ScheduledJobType
  status: ScheduledJobStatus
  payload: Record<string, unknown> | null
  qstash_message_id: string | null
  execute_at: string
  executed_at: string | null
  error_message: string | null
  created_at: string
}

export interface PlanConfig {
  plan: BusinessPlan
  display_name: string
  price_euros: number
  monthly_conversation_limit: number
  max_phone_numbers: number
  has_follow_ups: boolean
  has_reminders: boolean
  has_review_requests: boolean
  has_knowledge_base: boolean
  stripe_price_id_monthly: string | null
  features: Record<string, unknown>
}

export interface KnowledgeItem {
  id: string
  business_id: string
  title: string
  content: string
  category: string | null
  is_active: boolean
  created_at: string
}
