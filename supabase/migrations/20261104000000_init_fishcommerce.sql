-- ==============================================================================
-- Fishcommerce Production Schema for Supabase
-- Covers: Profiles, Products, Orders, Order Items, Order Status Events,
--         Atomic Checkout RPC, Realtime replication, and Row Level Security (RLS)
-- ==============================================================================

-- 1. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles are readable by owner and admins" ON public.profiles;
CREATE POLICY "Profiles are readable by owner and admins"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = id
    OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
  );

DROP POLICY IF EXISTS "Profiles are updateable by owner" ON public.profiles;
CREATE POLICY "Profiles are updateable by owner"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Trigger: Automatically create public.profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT := 'customer';
BEGIN
  -- Default admin if email matches admin email
  IF NEW.email = 'starboy1s2s3s3@gmail.com' OR NEW.email = 'admin@fishcommerce.com' THEN
    v_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_role
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id            TEXT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL UNIQUE,
  product_type  TEXT NOT NULL DEFAULT 'fish' CHECK (product_type IN ('fish', 'food')),
  price_cents   INTEGER NOT NULL CHECK (price_cents > 0),
  image_url     TEXT NOT NULL,
  water_type    TEXT,
  care_level    TEXT,
  temperament   TEXT,
  min_tank_gal  INTEGER CHECK (min_tank_gal BETWEEN 1 AND 1000),
  diet          VARCHAR(100) NOT NULL,
  description   TEXT NOT NULL,
  stock         INTEGER NOT NULL CHECK (stock >= 0),
  is_available  BOOLEAN NOT NULL DEFAULT true,
  badges        JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Products Policies:
-- Public can read all available products
DROP POLICY IF EXISTS "Public can view available products" ON public.products;
CREATE POLICY "Public can view available products"
  ON public.products FOR SELECT
  USING (
    is_available = true
    OR (
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
      )
    )
  );

-- Admins can insert/update/delete products
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );


-- 3. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       VARCHAR(30) NOT NULL UNIQUE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name   VARCHAR(100) NOT NULL,
  customer_phone  VARCHAR(30) NOT NULL,
  customer_email  VARCHAR(120) NOT NULL,
  street          VARCHAR(150) NOT NULL,
  city            VARCHAR(80) NOT NULL,
  postal_code     VARCHAR(20) NOT NULL,
  notes           TEXT NOT NULL DEFAULT '',
  subtotal_cents  INTEGER NOT NULL,
  shipping_cents  INTEGER NOT NULL,
  total_cents     INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'Pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Customers can view their own orders; Admins can view all orders
DROP POLICY IF EXISTS "Users can view own orders or admin all" ON public.orders;
CREATE POLICY "Users can view own orders or admin all"
  ON public.orders FOR SELECT
  USING (
    (auth.role() = 'authenticated' AND (select auth.uid()) = user_id)
    OR (
      auth.role() = 'authenticated' AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'
      )
    )
    OR (
      -- Guest order status lookup by reference
      reference IS NOT NULL
    )
  );

-- Any user (or guest) can insert orders
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- Only admins can update order status
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );


-- 4. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id  TEXT,
  name        VARCHAR(100) NOT NULL,
  price_cents INTEGER NOT NULL,
  image_url   TEXT NOT NULL,
  quantity    INTEGER NOT NULL CHECK (quantity > 0)
);

-- Enable RLS on order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view order items for viewable orders" ON public.order_items;
CREATE POLICY "Public can view order items for viewable orders"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
    )
  );

DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Anyone can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (true);


-- 5. Order Status Events Table
CREATE TABLE IF NOT EXISTS public.order_status_events (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id  UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status    TEXT NOT NULL,
  at        TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view status events" ON public.order_status_events;
CREATE POLICY "Public can view status events"
  ON public.order_status_events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert status events" ON public.order_status_events;
CREATE POLICY "Anyone can insert status events"
  ON public.order_status_events FOR INSERT
  WITH CHECK (true);


-- 6. Stored Procedure: Atomic place_order RPC
CREATE OR REPLACE FUNCTION public.place_order(
  p_reference       TEXT,
  p_user_id         UUID,
  p_customer_name   TEXT,
  p_customer_phone  TEXT,
  p_customer_email  TEXT,
  p_street          TEXT,
  p_city            TEXT,
  p_postal_code     TEXT,
  p_notes           TEXT,
  p_subtotal_cents  INTEGER,
  p_shipping_cents  INTEGER,
  p_total_cents     INTEGER,
  p_items           JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_prod_id TEXT;
  v_qty INTEGER;
  v_curr_stock INTEGER;
BEGIN
  -- Validate stock for all items first
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := v_item->>'productId';
    v_qty := (v_item->>'quantity')::INTEGER;

    SELECT stock INTO v_curr_stock
    FROM public.products
    WHERE id = v_prod_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found', v_prod_id;
    END IF;

    IF v_curr_stock < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for product % (available: %, requested: %)', v_prod_id, v_curr_stock, v_qty;
    END IF;
  END LOOP;

  -- Create order
  INSERT INTO public.orders (
    reference, user_id, customer_name, customer_phone, customer_email,
    street, city, postal_code, notes,
    subtotal_cents, shipping_cents, total_cents, status
  ) VALUES (
    p_reference, p_user_id, p_customer_name, p_customer_phone, p_customer_email,
    p_street, p_city, p_postal_code, COALESCE(p_notes, ''),
    p_subtotal_cents, p_shipping_cents, p_total_cents, 'Pending'
  )
  RETURNING id INTO v_order_id;

  -- Insert order items and deduct stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := v_item->>'productId';
    v_qty := (v_item->>'quantity')::INTEGER;

    INSERT INTO public.order_items (
      order_id, product_id, name, price_cents, image_url, quantity
    ) VALUES (
      v_order_id,
      v_prod_id,
      v_item->>'name',
      (v_item->>'priceCents')::INTEGER,
      COALESCE(v_item->>'image', '/images/placeholder.svg'),
      v_qty
    );

    UPDATE public.products
    SET stock = stock - v_qty,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_prod_id;
  END LOOP;

  -- Insert initial status event
  INSERT INTO public.order_status_events (order_id, status)
  VALUES (v_order_id, 'Pending');

  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_order_id,
    'reference', p_reference
  );
END;
$$;


-- 7. Seed Initial 14 Fish Products
INSERT INTO public.products (id, name, price_cents, image_url, water_type, care_level, temperament, min_tank_gal, diet, description, stock, is_available, badges)
VALUES
  ('crown-tail-betta', 'Crown Tail Betta', 2499, '/images/placeholder.svg', 'Freshwater', 'Beginner', 'Semi-Aggressive', 5, 'Flakes & Pellets', 'Distinctive spiked crown finnage and vivid iridescent coloring. Native to Southeast Asia, bettas thrive in low-current planted tanks. Best kept alone or with quiet, non-fin-nipping bottom dwellers.', 18, true, '["Best Seller"]'::jsonb),
  ('neon-tetra', 'Neon Tetra', 399, '/images/placeholder.svg', 'Freshwater', 'Beginner', 'Peaceful', 10, 'Flakes & Micro Pellets', 'Iconic iridescent blue stripe and bright crimson tail. Native to the blackwater basins of the Amazon. A quintessential schooling fish best housed in groups of 6 or more in well-cycled tanks.', 120, true, '["Schooling"]'::jsonb),
  ('fancy-guppy', 'Fancy Guppy', 499, '/images/placeholder.svg', 'Freshwater', 'Beginner', 'Peaceful', 5, 'Flakes', 'Hardy, active livebearers with flowing, kaleidoscopic tail patterns. Ideal for community tanks and beginners. Thrives in planted aquariums with gentle water flow.', 80, true, '[]'::jsonb),
  ('fancy-goldfish', 'Fancy Goldfish', 699, '/images/placeholder.svg', 'Freshwater', 'Beginner', 'Peaceful', 20, 'Flakes & Pellets', 'Beloved coldwater companions characterized by rounded egg-shaped bodies and elegant double tails. They enjoy cool, well-oxygenated water with strong filtration.', 40, true, '[]'::jsonb),
  ('panda-corydoras', 'Panda Corydoras', 799, '/images/placeholder.svg', 'Freshwater', 'Beginner', 'Peaceful', 20, 'Sinking Pellets', 'Charming bottom foragers with distinctive black eye patches mimicking giant pandas. Originates from sandy Peruvian riverbeds. Highly social fish that should be kept in schools on fine sand substrates.', 35, true, '[]'::jsonb),
  ('dwarf-gourami', 'Dwarf Gourami', 999, '/images/placeholder.svg', 'Freshwater', 'Intermediate', 'Peaceful', 10, 'Flakes', 'Peaceful labyrinth fish boasting neon turquoise and red-orange vertical stripes. They use modified pectoral fins like feelers to explore plants and slow-moving surface waters.', 25, true, '[]'::jsonb),
  ('angelfish', 'Angelfish', 1499, '/images/placeholder.svg', 'Freshwater', 'Intermediate', 'Semi-Aggressive', 29, 'Flakes & Frozen Foods', 'Graceful cichlid with tall dorsal and ventral fins that glide through vertical plant cover. Semi-aggressive during feeding and breeding; requires a deep, mature freshwater aquarium.', 22, true, '[]'::jsonb),
  ('discus', 'Discus', 7999, '/images/placeholder.svg', 'Freshwater', 'Expert', 'Peaceful', 55, 'Pellets & Bloodworms', 'Known as the "King of the Aquarium", discus feature round disc-like bodies with dazzling geometric coloration. Requires warm, pristine soft water and disciplined maintenance routines.', 6, true, '["Rare"]'::jsonb),
  ('silver-arowana', 'Silver Arowana', 24999, '/images/placeholder.svg', 'Freshwater', 'Expert', 'Aggressive', 250, 'Carnivore (Frozen/Live)', 'Majestic ancient predator renowned for its metallic silver scales and predatory surface hunting. Demands a massive, securely covered tank with heavy filtration and substantial swimming room.', 3, true, '["Rare"]'::jsonb),
  ('ocellaris-clownfish', 'Ocellaris Clownfish', 2999, '/images/placeholder.svg', 'Saltwater', 'Beginner', 'Peaceful', 20, 'Pellets & Mysis Shrimp', 'Bright orange marine fish with classic black-bordered white bands. Hardy, curious, and famously symbiotic with anemones. The gold standard for saltwater and reef tank beginners.', 30, true, '["New"]'::jsonb),
  ('royal-gramma', 'Royal Gramma', 2499, '/images/placeholder.svg', 'Saltwater', 'Beginner', 'Peaceful', 30, 'Pellets & Frozen Foods', 'Electrifying two-tone coloration: royal violet anterior transitioning into vibrant sun-yellow posterior. Native to deep Caribbean reefs, loving caves, overhangs, and dim crevices.', 15, true, '[]'::jsonb),
  ('yellow-tang', 'Yellow Tang', 4999, '/images/placeholder.svg', 'Saltwater', 'Intermediate', 'Semi-Aggressive', 75, 'Marine Algae & Nori', 'Stunning solid canary-yellow surgeonfish that provides constant movement and natural algae grazing in marine reef aquariums. Best kept with plenty of open swimming channels.', 12, true, '[]'::jsonb),
  ('blue-tang', 'Blue Tang', 5999, '/images/placeholder.svg', 'Saltwater', 'Intermediate', 'Peaceful', 100, 'Marine Algae & Nori', 'Vivid royal blue body bordered with bold black markings and a bright yellow paddle tail. Highly active swimmer requiring ample space, stable water chemistry, and herbivorous nutrition.', 9, true, '[]'::jsonb),
  ('mandarin-dragonet', 'Mandarin Dragonet', 4499, '/images/placeholder.svg', 'Saltwater', 'Expert', 'Peaceful', 30, 'Live Copepods', 'A mesmerizing psychedelic tapestry of blues, greens, and oranges. Slow-moving and gentle, this species requires an established reef with an abundant sustained supply of live copepods.', 5, true, '["Rare"]'::jsonb)
ON CONFLICT (id) DO NOTHING;
