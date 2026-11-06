-- Online orders must be created only by the verified payment backend.
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can insert status events" ON public.order_status_events;

REVOKE ALL ON FUNCTION public.place_order(
  TEXT,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  INTEGER,
  INTEGER,
  JSONB
) FROM PUBLIC, anon, authenticated;
