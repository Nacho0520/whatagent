-- Ensure onboarding_completed and is_active columns exist on businesses table.
-- These are already present in 001_initial_schema.sql; this migration is idempotent.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
