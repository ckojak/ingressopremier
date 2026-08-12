CREATE POLICY "org_docs_insert_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'organizer-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "org_docs_update_own" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'organizer-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'organizer-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "org_docs_select_own_or_admin" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'organizer-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));