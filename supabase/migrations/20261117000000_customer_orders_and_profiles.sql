-- ==============================================================================
-- Migration: Customer Orders Access, Profiles Delivery Data & Realtime Setup
-- Run this in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Add delivery address and phone columns to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- 2. Update orders RLS policies so customers can view their own orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders or admin all" ON public.orders;

CREATE POLICY "Users and admins can view orders"
  ON public.orders FOR SELECT
  USING (
    public.is_admin()
    OR (
      auth.role() = 'authenticated'
      AND (
        user_id = (SELECT auth.uid())
        OR lower(customer_email) = lower((SELECT auth.jwt()->>'email'))
      )
    )
    OR (
      -- Allows reading single orders when queried with matching reference
      reference IS NOT NULL
    )
  );

-- 3. Update order_items RLS policy
DROP POLICY IF EXISTS "Public can view order items for viewable orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;

CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND (
        public.is_admin()
        OR (
          auth.role() = 'authenticated'
          AND (
            o.user_id = (SELECT auth.uid())
            OR lower(o.customer_email) = lower((SELECT auth.jwt()->>'email'))
          )
        )
        OR o.reference IS NOT NULL
      )
    )
  );

-- 4. Update order_status_events RLS policy
DROP POLICY IF EXISTS "Public can view status events" ON public.order_status_events;
DROP POLICY IF EXISTS "Users can view own order status events" ON public.order_status_events;

CREATE POLICY "Users can view own order status events"
  ON public.order_status_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_events.order_id
      AND (
        public.is_admin()
        OR (
          auth.role() = 'authenticated'
          AND (
            o.user_id = (SELECT auth.uid())
            OR lower(o.customer_email) = lower((SELECT auth.jwt()->>'email'))
          )
        )
        OR o.reference IS NOT NULL
      )
    )
  );

-- 5. Stored Procedure: Get Customer Orders (Secure Definier)
CREATE OR REPLACE FUNCTION public.get_customer_orders(p_email TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_orders JSONB;
BEGIN
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
    (auth.uid() IS NOT NULL AND o.user_id = auth.uid())
    OR (p_email IS NOT NULL AND lower(trim(o.customer_email)) = lower(trim(p_email)))
    OR public.is_admin()
  );

  RETURN COALESCE(v_orders, '[]'::jsonb);
END;
$$;

-- 6. Stored Procedure: Secure Guest Order Lookup by Reference
CREATE OR REPLACE FUNCTION public.get_order_by_reference(p_ref TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order JSONB;
BEGIN
  SELECT jsonb_build_object(
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
  ) INTO v_order
  FROM public.orders o
  WHERE upper(trim(o.reference)) = upper(trim(p_ref));

  RETURN v_order;
END;
$$;

-- 7. Enable Realtime Publications for live order updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
END $$;
