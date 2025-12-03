-- Create storage bucket for event images
INSERT INTO storage.buckets (id, name, public) VALUES ('event-images', 'event-images', true);

-- Allow anyone to view event images
CREATE POLICY "Anyone can view event images" ON storage.objects
FOR SELECT USING (bucket_id = 'event-images');

-- Allow organizers/admins to upload event images
CREATE POLICY "Organizers can upload event images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'event-images' 
  AND (
    public.has_role(auth.uid(), 'organizer') 
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Allow organizers/admins to update their own event images
CREATE POLICY "Organizers can update event images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'event-images' 
  AND (
    public.has_role(auth.uid(), 'organizer') 
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Allow organizers/admins to delete event images
CREATE POLICY "Organizers can delete event images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'event-images' 
  AND (
    public.has_role(auth.uid(), 'organizer') 
    OR public.has_role(auth.uid(), 'admin')
  )
);