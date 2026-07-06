
-- Create site-images public storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-images', 'site-images', true);

-- Allow admins to upload/manage files
CREATE POLICY "Admins can manage site-images"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'));

-- Allow public read access
CREATE POLICY "Public read site-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'site-images');
