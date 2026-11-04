-- ==============================================================================
-- Storage Bucket & Policies for Product Images
-- ==============================================================================

-- 1. Create public storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow public read access to product-images
DROP POLICY IF EXISTS "Public Access to product-images" ON storage.objects;
CREATE POLICY "Public Access to product-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- 3. Allow authenticated users / admins to upload images
DROP POLICY IF EXISTS "Upload to product-images" ON storage.objects;
CREATE POLICY "Upload to product-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images');

-- 4. Allow updates and deletes
DROP POLICY IF EXISTS "Update product-images" ON storage.objects;
CREATE POLICY "Update product-images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Delete from product-images" ON storage.objects;
CREATE POLICY "Delete from product-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images');
