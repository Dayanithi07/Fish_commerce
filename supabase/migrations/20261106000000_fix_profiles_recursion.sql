-- ==============================================================================
-- Migration: Fix 500 Infinite Recursion on profiles & products (42P17)
-- Run this in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Create a SECURITY DEFINER helper function to check admin role
-- A SECURITY DEFINER function bypasses RLS on the profiles table, preventing infinite recursion!
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. Drop the recursive SELECT policy on public.profiles and replace with non-recursive policy
DROP POLICY IF EXISTS "Profiles are readable by owner and admins" ON public.profiles;
CREATE POLICY "Profiles are readable by owner and admins"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id OR public.is_admin()
  );

-- 3. Ensure products table has public read and supports product_type ('fish' or 'food')
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT
  USING (true);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'fish';

ALTER TABLE public.products
  ALTER COLUMN water_type DROP NOT NULL,
  ALTER COLUMN care_level DROP NOT NULL,
  ALTER COLUMN temperament DROP NOT NULL,
  ALTER COLUMN min_tank_gal DROP NOT NULL;

-- 4. Fix orders policies using is_admin() instead of recursive subqueries
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  USING (public.is_admin());
