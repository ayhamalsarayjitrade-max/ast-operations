DROP POLICY IF EXISTS "staff read profiles" ON public.profiles;
CREATE POLICY "scoped profiles read" ON public.profiles FOR SELECT TO authenticated USING (
  id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse')
);
DROP POLICY IF EXISTS "read roles" ON public.user_roles;
CREATE POLICY "scoped roles read" ON public.user_roles FOR SELECT TO authenticated USING (
  user_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse')
);

CREATE OR REPLACE FUNCTION public.delivery_proof_enforce()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'driver') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  new.driver_id := auth.uid(); new.delivered_at := now(); new.created_at := now();
  new.recipient_name := trim(new.recipient_name);
  IF length(new.recipient_name)<2 THEN RAISE EXCEPTION 'اسم المستلم مطلوب'; END IF;
  IF new.photo_path IS NULL AND new.signature_path IS NULL THEN RAISE EXCEPTION 'صورة أو توقيع المستلم مطلوب'; END IF;
  IF new.photo_path IS NOT NULL AND new.photo_path NOT LIKE auth.uid()::text || '/' || new.order_id::text || '/%' THEN RAISE EXCEPTION 'مسار الصورة غير صالح'; END IF;
  IF new.signature_path IS NOT NULL AND new.signature_path NOT LIKE auth.uid()::text || '/' || new.order_id::text || '/%' THEN RAISE EXCEPTION 'مسار التوقيع غير صالح'; END IF;
  RETURN new;
END $$;
DROP TRIGGER IF EXISTS delivery_proof_enforce_trigger ON public.delivery_proofs;
CREATE TRIGGER delivery_proof_enforce_trigger BEFORE INSERT ON public.delivery_proofs FOR EACH ROW EXECUTE FUNCTION public.delivery_proof_enforce();