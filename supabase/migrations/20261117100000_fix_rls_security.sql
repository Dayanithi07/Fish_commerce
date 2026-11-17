-- ==============================================================================
-- Migration: Fix RLS Security Policies & Close Authorization Gaps
-- Run this in Supabase Dashboard → SQL Editor
-- ==============================================================================

-- 1. Prevent privilege escalation: users cannot update their own role in profiles
-- unless promoted by an admin or accepting a valid pending invitation
DROP POLICY IF EXISTS "Profiles are updateable by owner" ON public.profiles;
CREATE POLICY "Profiles are updateable by owner"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      public.is_admin()
      OR role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
      OR (
        role = 'admin'
        AND EXISTS (
          SELECT 1 FROM public.admin_invitations ai
          WHERE lower(ai.email) = lower(public.profiles.email)
            AND ai.status = 'invited'
        )
      )
    )
  );

-- 2. Fix store_settings: only admins can write
DROP POLICY IF EXISTS "Auth users can write store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Only admins can write store_settings" ON public.store_settings;
CREATE POLICY "Only admins can write store_settings"
  ON public.store_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Fix admin_invitations: only admins can read and manage
DROP POLICY IF EXISTS "Anyone can read admin invitations" ON public.admin_invitations;
DROP POLICY IF EXISTS "Only admins can read admin invitations" ON public.admin_invitations;
CREATE POLICY "Only admins can read admin invitations"
  ON public.admin_invitations FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.admin_invitations;
DROP POLICY IF EXISTS "Only admins can manage invitations" ON public.admin_invitations;
CREATE POLICY "Only admins can manage invitations"
  ON public.admin_invitations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Fix products: only admins can insert/update/delete
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Only admins can insert products" ON public.products;
CREATE POLICY "Only admins can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Only admins can update products" ON public.products;
CREATE POLICY "Only admins can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Only admins can delete products" ON public.products;
CREATE POLICY "Only admins can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 5. Fix orders: only admins can update/delete
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Only admins can update orders" ON public.orders;
CREATE POLICY "Only admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Only admins can delete orders" ON public.orders;
CREATE POLICY "Only admins can delete orders"
  ON public.orders FOR DELETE
  USING (public.is_admin());

-- 6. Fix order_status_events: strictly only admins can insert status events
-- (Initial 'Pending' event is written server-side by place_order RPC which is SECURITY DEFINER)
DROP POLICY IF EXISTS "Anyone can insert status events" ON public.order_status_events;
DROP POLICY IF EXISTS "Admins and system can insert status events" ON public.order_status_events;
DROP POLICY IF EXISTS "Admins or initial pending status events can be inserted" ON public.order_status_events;
DROP POLICY IF EXISTS "Only admins can insert status events" ON public.order_status_events;
CREATE POLICY "Only admins can insert status events"
  ON public.order_status_events FOR INSERT
  WITH CHECK (public.is_admin());

-- 7. Fix storage: only admins can upload/modify product images
DROP POLICY IF EXISTS "Public Upload to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Upload to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can upload product images" ON storage.objects;
CREATE POLICY "Only admins can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Update product-images" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can update product images" ON storage.objects;
CREATE POLICY "Only admins can update product images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Delete from product-images" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can delete product images" ON storage.objects;
CREATE POLICY "Only admins can delete product images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND public.is_admin()
  );

-- 8. Fix IDOR on get_customer_orders: bind caller identity to auth context only
CREATE OR REPLACE FUNCTION public.get_customer_orders(p_email TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_orders JSONB;
  v_uid UUID := auth.uid();
  v_email TEXT := lower(trim(COALESCE(auth.jwt()->>'email', '')));
BEGIN
  -- Authenticated user check: ignore unverified caller argument p_email for non-admins
  IF v_uid IS NULL AND v_email = '' AND NOT public.is_admin() THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', o.id,
    'reference', o.reference,
    'userId', o.user_id,
    'customerName', o.customer_name,
    'customerEmail', o.customer_email,
    'customerPhone', o.customer_phone,
    'street', o.street,
    'city', o.city,
    'postalCode', o.postal_code,
    'notes', o.notes,
    'subtotal', (o.subtotal_cents / 100.0),
    'shipping', (o.shipping_cents / 100.0),
    'total', (o.total_cents / 100.0),
    'status', o.status,
    'createdAt', o.created_at,
    'updatedAt', o.updated_at,
    'items', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'productId', oi.product_id,
        'name', oi.name,
        'price', (oi.price_cents / 100.0),
        'quantity', oi.quantity,
        'image', oi.image_url
      )) FROM public.order_items oi WHERE oi.order_id = o.id),
      '[]'::jsonb
    ),
    'timeline', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'status', ose.status,
        'at', ose.at
      )) FROM public.order_status_events ose WHERE ose.order_id = o.id),
      '[]'::jsonb
    )
  ) ORDER BY o.created_at DESC) INTO v_orders
  FROM public.orders o
  WHERE (
    public.is_admin()
    OR (v_uid IS NOT NULL AND o.user_id = v_uid)
    OR (v_email <> '' AND lower(trim(o.customer_email)) = v_email)
  );

  RETURN COALESCE(v_orders, '[]'::jsonb);
END;
$$;
