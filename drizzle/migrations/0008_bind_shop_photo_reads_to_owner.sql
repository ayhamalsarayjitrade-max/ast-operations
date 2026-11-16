DROP POLICY IF EXISTS "scoped shop photo read" ON storage.objects;
CREATE POLICY "scoped shop photo read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'shop-photos' AND (
    owner_id = (select auth.uid()::text)
    OR public.has_role((select auth.uid()), 'admin')
    OR public.has_role((select auth.uid()), 'warehouse')
  )
);