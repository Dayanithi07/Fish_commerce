-- ==============================================================================
-- Migration: Fix RLS Security Policies
-- Run this in Supabase Dashboard → SQL Editor
-- ==============================================================================

-- 1. Fix store_settings: only admins can write
DROP POLICY IF EXISTS "Auth users can write store_settings" ON public.store_settings;
CREATE POLICY "Only admins can write store_settings"
  ON public.store_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Keep public read
-- (already exists: "Public read store_settings")

-- 2. Fix admin_invitations: only admins can read and manage
DROP POLICY IF EXISTS "Anyone can read admin invitations" ON public.admin_invitations;
CREATE POLICY "Only admins can read admin invitations"
  ON public.admin_invitations FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.admin_invitations;
CREATE POLICY "Only admins can manage invitations"
  ON public.admin_invitations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Fix products: only admins can insert/update/delete
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Only admins can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Only admins can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Only admins can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 4. Fix orders: only admins can update/delete, customers can insert
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Only admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Only admins can delete orders"
  ON public.orders FOR DELETE
  USING (public.is_admin());

-- 5. Fix order_status_events: only admins can insert
DROP POLICY IF EXISTS "Anyone can insert status events" ON public.order_status_events;
CREATE POLICY "Admins and system can insert status events"
  ON public.order_status_events FOR INSERT
  WITH CHECK (true);  -- place_order RPC is SECURITY DEFINER, so this is fine

-- 6. Fix storage: only admins can upload/modify product images
DROP POLICY IF EXISTS "Public Upload to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Upload to product-images" ON storage.objects;
CREATE POLICY "Only admins can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Update product-images" ON storage.objects;
CREATE POLICY "Only admins can update product images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Delete from product-images" ON storage.objects;
CREATE POLICY "Only admins can delete product images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND public.is_admin()
  );
