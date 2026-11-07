-- ==============================================================================
-- Migration: Admin Accounts Synchronization & Status Tracking
-- Run this in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Add status column to public.profiles if not present
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- 2. Create admin_invitations table to track invited and pending staff
CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'revoked')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for admin_invitations
DROP POLICY IF EXISTS "Anyone can read admin invitations" ON public.admin_invitations;
CREATE POLICY "Anyone can read admin invitations"
  ON public.admin_invitations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.admin_invitations;
CREATE POLICY "Admins can manage invitations"
  ON public.admin_invitations FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Ensure Super Admin profile has active status
UPDATE public.profiles
SET status = 'active'
WHERE email = 'starboy1s2s3s3@gmail.com' AND status IS NULL;
