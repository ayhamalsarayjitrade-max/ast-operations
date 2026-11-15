CREATE TABLE public.customer_accounts (
  user_id uuid PRIMARY KEY,
  customer_id uuid NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_accounts TO authenticated;
GRANT ALL ON public.customer_accounts TO service_role;
ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.delivery_proofs (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL,
  recipient_name text NOT NULL,
  photo_path text,
  signature_path text,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delivery_proof_media CHECK (photo_path IS NOT NULL OR signature_path IS NOT NULL)
);
GRANT SELECT, INSERT ON public.delivery_proofs TO authenticated;
GRANT ALL ON public.delivery_proofs TO service_role;
ALTER TABLE public.delivery_proofs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  goal text,
  created_by uuid,
  clicks integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invite_links TO authenticated;
GRANT ALL ON public.invite_links TO service_role;
ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.invite_signups (
  invite_id uuid NOT NULL REFERENCES public.invite_links(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (invite_id, user_id)
);
GRANT SELECT ON public.invite_signups TO authenticated;
GRANT ALL ON public.invite_signups TO service_role;
ALTER TABLE public.invite_signups ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.visits ADD COLUMN ai_summary text;
ALTER TABLE public.visits ADD COLUMN ai_follow_up text;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('admin','rep','warehouse','driver'))
$$;

CREATE OR REPLACE FUNCTION public.can_access_order(_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse') OR EXISTS(
    SELECT 1 FROM public.orders o
    WHERE o.id=_order_id AND (o.rep_id=auth.uid() OR o.driver_id=auth.uid() OR EXISTS(
      SELECT 1 FROM public.customer_accounts ca WHERE ca.user_id=auth.uid() AND ca.customer_id=o.customer_id
    ))
  )
$$;

CREATE POLICY "customer account admin" ON public.customer_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "customer account own read" ON public.customer_accounts FOR SELECT TO authenticated USING (user_id=auth.uid());

CREATE POLICY "proof read" ON public.delivery_proofs FOR SELECT TO authenticated USING (public.can_access_order(order_id));
CREATE POLICY "proof driver insert" ON public.delivery_proofs FOR INSERT TO authenticated WITH CHECK (
  driver_id=auth.uid() AND public.has_role(auth.uid(),'driver') AND EXISTS(
    SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.driver_id=auth.uid() AND o.status='out_for_delivery'
  )
);

CREATE POLICY "invite admin all" ON public.invite_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "invite signup admin read" ON public.invite_signups FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "staff read" ON public.orders;
CREATE POLICY "scoped orders read" ON public.orders FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse') OR rep_id=auth.uid() OR driver_id=auth.uid() OR EXISTS(
    SELECT 1 FROM public.customer_accounts ca WHERE ca.user_id=auth.uid() AND ca.customer_id=orders.customer_id
  )
);
DROP POLICY IF EXISTS "staff update" ON public.orders;
CREATE POLICY "staff order update" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse'));
CREATE POLICY "driver order update" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'driver') AND driver_id=auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'driver') AND driver_id=auth.uid());

DROP POLICY IF EXISTS "staff read" ON public.order_items;
CREATE POLICY "scoped items read" ON public.order_items FOR SELECT TO authenticated USING (public.can_access_order(order_id));
DROP POLICY IF EXISTS "staff read" ON public.order_events;
CREATE POLICY "scoped events read" ON public.order_events FOR SELECT TO authenticated USING (public.can_access_order(order_id));

DROP POLICY IF EXISTS "staff read" ON public.customers;
CREATE POLICY "scoped customers read" ON public.customers FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse') OR created_by=auth.uid() OR EXISTS(
    SELECT 1 FROM public.orders o WHERE o.customer_id=customers.id AND (o.rep_id=auth.uid() OR o.driver_id=auth.uid())
  ) OR EXISTS(
    SELECT 1 FROM public.visits v WHERE v.customer_id=customers.id AND v.rep_id=auth.uid()
  ) OR EXISTS(
    SELECT 1 FROM public.customer_accounts ca WHERE ca.user_id=auth.uid() AND ca.customer_id=customers.id
  )
);
DROP POLICY IF EXISTS "staff read" ON public.visits;
CREATE POLICY "scoped visits read" ON public.visits FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse') OR rep_id=auth.uid()
);
DROP POLICY IF EXISTS "staff read" ON public.driver_locations;
CREATE POLICY "scoped locations read" ON public.driver_locations FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse') OR driver_id=auth.uid()
);
DROP POLICY IF EXISTS "staff read" ON public.products;
CREATE POLICY "catalog read" ON public.products FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'customer')
);
DROP POLICY IF EXISTS "staff read" ON public.stock_movements;
CREATE POLICY "warehouse stock read" ON public.stock_movements FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse')
);

CREATE OR REPLACE FUNCTION public.order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  new.updated_at := now();
  IF public.has_role(auth.uid(),'driver') AND NOT public.has_role(auth.uid(),'admin') AND NOT public.has_role(auth.uid(),'warehouse') THEN
    IF new.driver_id IS DISTINCT FROM old.driver_id THEN RAISE EXCEPTION 'لا يمكن للسائق تغيير إسناد الطلب'; END IF;
    new.customer_id := old.customer_id; new.rep_id := old.rep_id; new.phone := old.phone;
    new.address := old.address; new.lat := old.lat; new.lng := old.lng; new.delivery_at := old.delivery_at;
    new.notes := old.notes; new.total := old.total; new.visit_id := old.visit_id; new.number := old.number;
    IF NOT ((old.status IN ('assigned','ready') AND new.status='out_for_delivery') OR (old.status='out_for_delivery' AND new.status='delivered')) THEN
      RAISE EXCEPTION 'انتقال حالة غير مسموح للسائق';
    END IF;
  END IF;
  IF new.driver_id IS NOT NULL AND old.driver_id IS NULL AND new.status IN ('new','preparing','ready') THEN new.status := 'assigned'; END IF;
  IF new.status='delivered' AND old.status IS DISTINCT FROM 'delivered' AND NOT EXISTS(SELECT 1 FROM public.delivery_proofs dp WHERE dp.order_id=new.id) THEN
    RAISE EXCEPTION 'إثبات التسليم مطلوب قبل إتمام الطلب';
  END IF;
  IF new.status IS DISTINCT FROM old.status THEN
    INSERT INTO public.order_events(order_id,status,actor) VALUES(new.id,new.status,auth.uid());
    IF new.status IN ('ready','assigned') AND old.status IN ('new','preparing') THEN
      INSERT INTO public.stock_movements(product_id,qty,note,order_id,created_by)
      SELECT product_id,-qty,'صرف طلب #' || new.number,new.id,auth.uid() FROM public.order_items WHERE order_id=new.id;
    END IF;
  END IF;
  RETURN new;
END $$;

CREATE OR REPLACE FUNCTION public.submit_delivery_proof(payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o_id uuid := (payload->>'order_id')::uuid; d_id uuid := auth.uid(); photo text := nullif(payload->>'photo_path',''); sig text := nullif(payload->>'signature_path','');
BEGIN
  IF d_id IS NULL OR NOT public.has_role(d_id,'driver') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.orders WHERE id=o_id AND driver_id=d_id AND status='out_for_delivery') THEN RAISE EXCEPTION 'الطلب غير مسند إليك أو ليس في الطريق'; END IF;
  IF length(trim(coalesce(payload->>'recipient_name','')))<2 THEN RAISE EXCEPTION 'اسم المستلم مطلوب'; END IF;
  IF payload->>'lat' IS NULL OR payload->>'lng' IS NULL THEN RAISE EXCEPTION 'موقع التسليم مطلوب'; END IF;
  IF photo IS NULL AND sig IS NULL THEN RAISE EXCEPTION 'صورة أو توقيع المستلم مطلوب'; END IF;
  IF photo IS NOT NULL AND photo NOT LIKE d_id::text || '/' || o_id::text || '/%' THEN RAISE EXCEPTION 'مسار الصورة غير صالح'; END IF;
  IF sig IS NOT NULL AND sig NOT LIKE d_id::text || '/' || o_id::text || '/%' THEN RAISE EXCEPTION 'مسار التوقيع غير صالح'; END IF;
  INSERT INTO public.delivery_proofs(order_id,driver_id,recipient_name,photo_path,signature_path,lat,lng)
  VALUES(o_id,d_id,trim(payload->>'recipient_name'),photo,sig,(payload->>'lat')::double precision,(payload->>'lng')::double precision);
  UPDATE public.orders SET status='delivered' WHERE id=o_id AND driver_id=d_id;
  RETURN o_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_delivery_proof(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_delivery_proof(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_customer_order(payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o_id uuid := (payload->>'id')::uuid; c_id uuid; item jsonb; total_value numeric := 0; existing_customer uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'customer') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  SELECT customer_id INTO c_id FROM public.customer_accounts WHERE user_id=auth.uid();
  IF c_id IS NULL THEN RAISE EXCEPTION 'لم يربط المدير حسابك بعميل بعد'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(o_id::text,0));
  SELECT customer_id INTO existing_customer FROM public.orders WHERE id=o_id;
  IF FOUND THEN IF existing_customer=c_id THEN RETURN o_id; ELSE RAISE EXCEPTION 'معرف الطلب مستخدم'; END IF; END IF;
  IF payload->'items' IS NULL OR jsonb_array_length(payload->'items')=0 THEN RAISE EXCEPTION 'أضف منتجات للطلب'; END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    IF (item->>'qty')::numeric<=0 OR NOT EXISTS(SELECT 1 FROM public.products WHERE id=(item->>'product_id')::uuid) THEN RAISE EXCEPTION 'منتج أو كمية غير صالحة'; END IF;
    total_value := total_value + (item->>'qty')::numeric * (SELECT price FROM public.products WHERE id=(item->>'product_id')::uuid);
  END LOOP;
  INSERT INTO public.orders(id,customer_id,phone,address,lat,lng,delivery_at,notes,total)
  SELECT o_id,c.id,c.phone,c.address,c.lat,c.lng,nullif(payload->>'delivery_at','')::timestamptz,nullif(payload->>'notes',''),total_value FROM public.customers c WHERE c.id=c_id;
  INSERT INTO public.order_items(order_id,product_id,qty,price)
  SELECT o_id,p.id,(x->>'qty')::numeric,p.price FROM jsonb_array_elements(payload->'items') x JOIN public.products p ON p.id=(x->>'product_id')::uuid;
  RETURN o_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_customer_order(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_customer_order(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.record_invite_click(_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _code IS NULL OR length(_code)<8 OR length(_code)>80 THEN RETURN; END IF;
  UPDATE public.invite_links SET clicks=clicks+1 WHERE code=_code AND active;
END $$;
REVOKE ALL ON FUNCTION public.record_invite_click(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_invite_click(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.complete_invite_signup(_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  INSERT INTO public.invite_signups(invite_id,user_id) SELECT id,auth.uid() FROM public.invite_links WHERE code=_code AND active ON CONFLICT (user_id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.complete_invite_signup(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_invite_signup(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "staff read photos" ON storage.objects;
CREATE POLICY "scoped shop photo read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='shop-photos' AND (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse') OR name LIKE auth.uid()::text || '/%' OR EXISTS(
      SELECT 1 FROM public.visits v WHERE v.photo_path=name AND v.rep_id=auth.uid()
    )
  )
);
DROP POLICY IF EXISTS "staff upload photos" ON storage.objects;
CREATE POLICY "rep upload shop photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id='shop-photos' AND name LIKE auth.uid()::text || '/%' AND (public.has_role(auth.uid(),'rep') OR public.has_role(auth.uid(),'admin'))
);
CREATE POLICY "delivery proof read files" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='delivery-proofs' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse') OR EXISTS(
    SELECT 1 FROM public.delivery_proofs dp WHERE dp.order_id=split_part(name,'/',2)::uuid AND (dp.photo_path=name OR dp.signature_path=name) AND public.can_access_order(dp.order_id)
  ))
);
CREATE POLICY "driver upload delivery proof" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id='delivery-proofs' AND public.has_role(auth.uid(),'driver') AND name LIKE auth.uid()::text || '/%' AND EXISTS(
    SELECT 1 FROM public.orders o WHERE o.id=split_part(name,'/',2)::uuid AND o.driver_id=auth.uid() AND o.status='out_for_delivery'
  )
);