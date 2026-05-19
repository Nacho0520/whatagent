-- Remove Meta-specific columns from businesses
ALTER TABLE businesses
  DROP COLUMN IF EXISTS meta_phone_number_id,
  DROP COLUMN IF EXISTS meta_waba_id,
  DROP COLUMN IF EXISTS meta_access_token,
  DROP COLUMN IF EXISTS whatsapp_warming_tier,
  DROP COLUMN IF EXISTS whatsapp_warming_start_date,
  DROP COLUMN IF EXISTS whatsapp_quality_rating,
  DROP COLUMN IF EXISTS whatsapp_messages_sent_today,
  DROP COLUMN IF EXISTS whatsapp_last_reset_date;

-- Add Twilio-specific columns
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT,
  ADD COLUMN IF NOT EXISTS twilio_auth_token TEXT,
  ADD COLUMN IF NOT EXISTS twilio_whatsapp_number TEXT;
-- twilio_whatsapp_number format: 'whatsapp:+14155238886'

-- Remove Meta message ID uniqueness from messages
-- Replace with Twilio SID for deduplication
ALTER TABLE messages
  DROP COLUMN IF EXISTS meta_message_id;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS twilio_message_sid TEXT UNIQUE;

-- Drop old index if exists
DROP INDEX IF EXISTS idx_messages_meta_id;

-- New index for Twilio SID deduplication
CREATE INDEX IF NOT EXISTS idx_messages_twilio_sid ON messages(twilio_message_sid)
  WHERE twilio_message_sid IS NOT NULL;
