-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- user_supply table
CREATE TABLE public.user_supply (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commodity TEXT NOT NULL CHECK (commodity IN ('electricity', 'gas')),
  cap TEXT NOT NULL,
  annual_kwh NUMERIC,
  annual_smc NUMERIC,
  consumption_band TEXT CHECK (consumption_band IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, commodity)
);

ALTER TABLE public.user_supply ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own supply" ON public.user_supply FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own supply" ON public.user_supply FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own supply" ON public.user_supply FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own supply" ON public.user_supply FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_supply_updated_at BEFORE UPDATE ON public.user_supply FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- current_contract table
CREATE TABLE public.current_contract (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commodity TEXT NOT NULL CHECK (commodity IN ('electricity', 'gas')),
  supplier_name TEXT,
  offer_name TEXT,
  price_type TEXT NOT NULL CHECK (price_type IN ('fixed', 'variable')),
  unit_price NUMERIC,
  fixed_fee_monthly NUMERIC NOT NULL DEFAULT 0,
  expiry_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, commodity)
);

ALTER TABLE public.current_contract ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own contract" ON public.current_contract FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contract" ON public.current_contract FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contract" ON public.current_contract FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contract" ON public.current_contract FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_current_contract_updated_at BEFORE UPDATE ON public.current_contract FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- notification_prefs table
CREATE TABLE public.notification_prefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  min_savings_annual NUMERIC NOT NULL DEFAULT 80,
  max_better_offer_frequency_days INTEGER NOT NULL DEFAULT 7,
  enable_expiry_reminders BOOLEAN NOT NULL DEFAULT true,
  expiry_offsets_days INTEGER[] NOT NULL DEFAULT '{30,7,1}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own prefs" ON public.notification_prefs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prefs" ON public.notification_prefs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prefs" ON public.notification_prefs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own prefs" ON public.notification_prefs FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_notification_prefs_updated_at BEFORE UPDATE ON public.notification_prefs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- offers table
CREATE TABLE public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'PORTALE_OFFERTE',
  source_offer_id TEXT NOT NULL,
  commodity TEXT NOT NULL CHECK (commodity IN ('electricity', 'gas')),
  supplier_name TEXT NOT NULL,
  offer_name TEXT NOT NULL,
  price_type TEXT CHECK (price_type IN ('fixed', 'variable')),
  unit_price_est NUMERIC,
  fixed_fee_monthly_est NUMERIC,
  url_offer TEXT,
  valid_from DATE,
  valid_to DATE,
  raw JSONB,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_offer_id)
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read offers" ON public.offers FOR SELECT TO authenticated USING (true);

-- alerts table
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('BETTER_OFFER', 'EXPIRY_REMINDER')),
  commodity TEXT CHECK (commodity IN ('electricity', 'gas')),
  offer_id UUID REFERENCES public.offers(id),
  savings_annual_est NUMERIC,
  message TEXT NOT NULL,
  sent_via TEXT NOT NULL DEFAULT 'EMAIL',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON public.alerts FOR DELETE USING (auth.uid() = user_id);

-- import_runs table
CREATE TABLE public.import_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  source TEXT NOT NULL DEFAULT 'PORTALE_OFFERTE',
  errors JSONB
);

ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read import runs" ON public.import_runs FOR SELECT TO authenticated USING (true);

-- consumption_band_defaults table
CREATE TABLE public.consumption_band_defaults (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commodity TEXT NOT NULL CHECK (commodity IN ('electricity', 'gas')),
  band TEXT NOT NULL CHECK (band IN ('low', 'medium', 'high')),
  annual_value NUMERIC NOT NULL,
  UNIQUE (commodity, band)
);

ALTER TABLE public.consumption_band_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read band defaults" ON public.consumption_band_defaults FOR SELECT TO authenticated USING (true);

-- Seed band defaults
INSERT INTO public.consumption_band_defaults (commodity, band, annual_value) VALUES
  ('electricity', 'low', 1800),
  ('electricity', 'medium', 2700),
  ('electricity', 'high', 4000),
  ('gas', 'low', 600),
  ('gas', 'medium', 1000),
  ('gas', 'high', 1400);

-- consents table
CREATE TABLE public.consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  affiliate_lead_consent BOOLEAN NOT NULL DEFAULT false,
  analytics_consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own consents" ON public.consents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own consents" ON public.consents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own consents" ON public.consents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own consents" ON public.consents FOR DELETE USING (auth.uid() = user_id);

-- Seed demo offers
INSERT INTO public.offers (source, source_offer_id, commodity, supplier_name, offer_name, price_type, unit_price_est, fixed_fee_monthly_est, url_offer, valid_from, valid_to) VALUES
  ('PORTALE_OFFERTE', 'DEMO-E-001', 'electricity', 'Enel Energia', 'E-Light Luce', 'variable', 0.0680, 5.90, 'https://www.enel.it', '2025-01-01', '2026-12-31'),
  ('PORTALE_OFFERTE', 'DEMO-E-002', 'electricity', 'Edison', 'Web Luce', 'fixed', 0.0720, 3.00, 'https://www.edison.it', '2025-01-01', '2026-12-31'),
  ('PORTALE_OFFERTE', 'DEMO-E-003', 'electricity', 'Eni Plenitude', 'Trend Casa Luce', 'variable', 0.0650, 7.50, 'https://www.eniplenitude.com', '2025-01-01', '2026-12-31'),
  ('PORTALE_OFFERTE', 'DEMO-E-004', 'electricity', 'A2A Energia', 'Click Luce', 'fixed', 0.0750, 0.00, 'https://www.a2a.eu', '2025-01-01', '2026-12-31'),
  ('PORTALE_OFFERTE', 'DEMO-G-001', 'gas', 'Enel Energia', 'E-Light Gas', 'variable', 0.3200, 5.90, 'https://www.enel.it', '2025-01-01', '2026-12-31'),
  ('PORTALE_OFFERTE', 'DEMO-G-002', 'gas', 'Edison', 'Web Gas', 'fixed', 0.3500, 3.00, 'https://www.edison.it', '2025-01-01', '2026-12-31'),
  ('PORTALE_OFFERTE', 'DEMO-G-003', 'gas', 'Eni Plenitude', 'Trend Casa Gas', 'variable', 0.3100, 7.50, 'https://www.eniplenitude.com', '2025-01-01', '2026-12-31');