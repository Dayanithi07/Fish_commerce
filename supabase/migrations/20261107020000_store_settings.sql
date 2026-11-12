-- ==============================================================================
-- Migration: Store Settings Table
-- Run in Supabase Dashboard -> SQL Editor
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.store_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can read store settings (needed for invoice generation)
DROP POLICY IF EXISTS "Public read store_settings" ON public.store_settings;
CREATE POLICY "Public read store_settings"
  ON public.store_settings FOR SELECT
  USING (true);

-- Authenticated users can write (admin portal saves settings)
DROP POLICY IF EXISTS "Auth users can write store_settings" ON public.store_settings;
CREATE POLICY "Auth users can write store_settings"
  ON public.store_settings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Seed default values (safe to run multiple times)
INSERT INTO public.store_settings (key, value) VALUES
  ('store_name',      'VP Aquarium'),
  ('support_email',   'starboy1s2s3s3@gmail.com'),
  ('support_phone',   '+91 00000 00000'),
  ('support_hours',   'Mon – Sat: 9:00 AM – 6:00 PM IST'),
  ('upi_id',          'ganesh123madesh@okaxis'),
  ('store_address',   'Chennai, Tamil Nadu, India'),
  ('whatsapp_number', '910000000000')
ON CONFLICT (key) DO NOTHING;
