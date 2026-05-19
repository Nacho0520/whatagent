-- Stripe plan price IDs (update with real IDs after creating products in Stripe)
CREATE TABLE plan_configs (
  plan TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  price_euros INTEGER NOT NULL,
  monthly_conversation_limit INTEGER NOT NULL,
  max_phone_numbers INTEGER NOT NULL,
  has_follow_ups BOOLEAN DEFAULT false,
  has_reminders BOOLEAN DEFAULT false,
  has_review_requests BOOLEAN DEFAULT false,
  has_knowledge_base BOOLEAN DEFAULT false,
  stripe_price_id_monthly TEXT,
  features JSONB
);

INSERT INTO plan_configs VALUES
('trial', 'Prueba Gratuita', 0, 50, 1, false, false, false, false, null, '{"conversations": 50, "numbers": 1}'::jsonb),
('starter', 'Plan Inicio', 79, 500, 1, false, true, false, false, null, '{"conversations": 500, "numbers": 1, "reminders": true}'::jsonb),
('business', 'Plan Negocio', 149, 2000, 3, true, true, true, true, null, '{"conversations": 2000, "numbers": 3, "follow_ups": true, "reminders": true, "reviews": true, "knowledge_base": true}'::jsonb),
('agency', 'Plan Agencia', 299, 999999, 10, true, true, true, true, null, '{"conversations": "unlimited", "numbers": 10, "all_features": true}'::jsonb);

-- Read-only policy for everyone (plans are public info)
ALTER TABLE plan_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_readable_by_all" ON plan_configs FOR SELECT USING (true);
