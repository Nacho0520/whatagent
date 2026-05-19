-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- BUSINESSES (tenants)
-- ============================================
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Business identity
  name TEXT NOT NULL,
  industry TEXT DEFAULT 'general',
  city TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,

  -- WhatsApp / Meta configuration
  meta_phone_number_id TEXT UNIQUE,
  meta_waba_id TEXT,
  meta_access_token TEXT, -- stored encrypted via Supabase Vault in production
  whatsapp_connected BOOLEAN DEFAULT false,
  whatsapp_warming_tier INTEGER DEFAULT 1, -- 1=250/day, 2=1000/day, 3=10000/day
  whatsapp_warming_start_date TIMESTAMPTZ,
  whatsapp_quality_rating TEXT DEFAULT 'GREEN' CHECK (whatsapp_quality_rating IN ('GREEN', 'YELLOW', 'RED')),
  whatsapp_messages_sent_today INTEGER DEFAULT 0,
  whatsapp_last_reset_date DATE DEFAULT CURRENT_DATE,

  -- AI Agent configuration
  agent_name TEXT DEFAULT 'Asistente',
  agent_persona TEXT DEFAULT 'Soy un asistente virtual amable y profesional.',
  business_context TEXT DEFAULT '',
  agent_tone TEXT DEFAULT 'professional' CHECK (agent_tone IN ('formal', 'professional', 'friendly', 'casual')),
  escalation_phone TEXT,
  escalation_email TEXT,

  -- Google Calendar OAuth
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expiry TIMESTAMPTZ,
  google_calendar_id TEXT,
  calendar_connected BOOLEAN DEFAULT false,

  -- Subscription / Billing
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial', 'starter', 'business', 'agency')),
  plan_status TEXT DEFAULT 'active' CHECK (plan_status IN ('active', 'past_due', 'canceled', 'trialing')),
  ai_requests_this_month INTEGER DEFAULT 0,
  template_messages_this_month INTEGER DEFAULT 0,
  billing_cycle_start TIMESTAMPTZ DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),

  -- Plan limits (cached for fast lookup)
  monthly_conversation_limit INTEGER DEFAULT 50,

  -- Status
  is_active BOOLEAN DEFAULT true,
  onboarding_step INTEGER DEFAULT 1 CHECK (onboarding_step BETWEEN 1 AND 5),
  onboarding_completed BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SERVICES (offerings of each business)
-- ============================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price_cents INTEGER, -- price in cents to avoid float errors
  currency TEXT DEFAULT 'EUR',
  duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONVERSATIONS
-- ============================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  customer_phone TEXT NOT NULL, -- E.164 format e.g. +34612345678
  customer_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated', 'waiting_human')),

  -- CSW (Customer Service Window) tracking — CRITICAL for Meta billing
  last_customer_message_at TIMESTAMPTZ,
  csw_expires_at TIMESTAMPTZ GENERATED ALWAYS AS (last_customer_message_at + INTERVAL '24 hours') STORED,

  -- Pending appointment slots (stored temporarily while customer chooses)
  pending_appointment_slots JSONB,
  pending_service_id UUID,

  -- Follow-up tracking
  follow_up_sent BOOLEAN DEFAULT false,
  follow_up_job_id TEXT,

  -- Metrics
  total_messages INTEGER DEFAULT 0,
  ai_messages INTEGER DEFAULT 0,

  -- Timestamps
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, customer_phone)
);

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL, -- denormalized for performance

  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Meta tracking
  meta_message_id TEXT UNIQUE, -- WhatsApp message ID for deduplication

  -- AI metadata
  intent_classified TEXT,
  intent_confidence FLOAT,
  was_deterministic BOOLEAN DEFAULT false, -- true = no LLM used, saved tokens
  model_used TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_microcents INTEGER DEFAULT 0, -- cost in microcents (1/100 of a cent)

  -- Processing metadata
  processing_time_ms INTEGER,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- APPOINTMENTS
-- ============================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,

  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  customer_notes TEXT,

  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER,
  google_event_id TEXT,

  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show', 'rescheduled')),

  -- Automation tracking
  reminder_24h_sent BOOLEAN DEFAULT false,
  reminder_2h_sent BOOLEAN DEFAULT false,
  review_requested BOOLEAN DEFAULT false,

  -- QStash job IDs for cancellation if appointment is cancelled
  reminder_job_id TEXT,
  review_job_id TEXT,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCHEDULED JOBS (for auditing QStash jobs)
-- ============================================
CREATE TABLE scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('follow_up', 'reminder_24h', 'reminder_2h', 'review_request', 'warming_check', 'quality_check')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  payload JSONB,
  qstash_message_id TEXT,
  execute_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BUSINESS KNOWLEDGE BASE (for RAG - Phase 2)
-- ============================================
CREATE TABLE knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_conversations_business_id ON conversations(business_id);
CREATE INDEX idx_conversations_customer_phone ON conversations(business_id, customer_phone);
CREATE INDEX idx_conversations_status ON conversations(business_id, status);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_business_id ON messages(business_id);
CREATE INDEX idx_messages_meta_id ON messages(meta_message_id) WHERE meta_message_id IS NOT NULL;
CREATE INDEX idx_appointments_business_id ON appointments(business_id);
CREATE INDEX idx_appointments_scheduled_at ON appointments(business_id, scheduled_at);
CREATE INDEX idx_scheduled_jobs_execute_at ON scheduled_jobs(execute_at, status);
CREATE INDEX idx_businesses_meta_phone ON businesses(meta_phone_number_id) WHERE meta_phone_number_id IS NOT NULL;

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;

-- Business owners see only their own business
CREATE POLICY "owners_see_own_business" ON businesses
  FOR ALL USING (owner_id = auth.uid());

-- Business-linked tables: owner sees their business's data
CREATE POLICY "owners_see_own_services" ON services
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "owners_see_own_conversations" ON conversations
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "owners_see_own_messages" ON messages
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "owners_see_own_appointments" ON appointments
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "owners_see_own_jobs" ON scheduled_jobs
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "owners_see_own_knowledge" ON knowledge_items
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- NOTE: Worker endpoints use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS
-- Worker MUST always filter by business_id explicitly in all queries
