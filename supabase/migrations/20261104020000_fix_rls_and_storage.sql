-- ==============================================================================
-- Fix Product Management RLS & Create Storage Bucket
-- Run this in Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Create public storage bucket for product-images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access to product images
DROP POLICY IF EXISTS "Public Access to product-images" ON storage.objects;
CREATE POLICY "Public Access to product-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Allow image uploads to product-images
DROP POLICY IF EXISTS "Public Upload to product-images" ON storage.objects;
CREATE POLICY "Public Upload to product-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Update product-images" ON storage.objects;
CREATE POLICY "Update product-images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Delete from product-images" ON storage.objects;
CREATE POLICY "Delete from product-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images');


-- 2. Update Products Table RLS to allow Admin Operations
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  USING (true);
