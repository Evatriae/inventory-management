-- Create storage bucket for item images (ALREADY EXECUTED)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('item-images', 'item-images', true);

-- Create policy to allow public read access to images (ALREADY EXECUTED)
-- CREATE POLICY "Anyone can view item images" ON storage.objects
-- FOR SELECT USING (bucket_id = 'item-images');

-- Create policy to allow only staff to upload images (ALREADY EXECUTED)
-- CREATE POLICY "Staff can upload item images" ON storage.objects
-- FOR INSERT WITH CHECK (
--   bucket_id = 'item-images' AND
--   auth.uid() IN (
--     SELECT id FROM profiles WHERE role = 'staff'
--   )
-- );

-- Create policy to allow only staff to update item images
CREATE POLICY "Staff can update item images" ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'item-images' AND
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'staff'
  )
);

-- Create policy to allow only staff to delete item images
CREATE POLICY "Staff can delete item images" ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'item-images' AND
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'staff'
  )
);