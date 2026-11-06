ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'fish';

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_product_type_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_product_type_check
  CHECK (product_type IN ('fish', 'food'));

ALTER TABLE public.products
  ALTER COLUMN water_type DROP NOT NULL,
  ALTER COLUMN care_level DROP NOT NULL,
  ALTER COLUMN temperament DROP NOT NULL,
  ALTER COLUMN min_tank_gal DROP NOT NULL;
