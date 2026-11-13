CREATE OR REPLACE FUNCTION public.sync_field_record(payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_id uuid := (payload->>'id')::uuid; c_id uuid := (payload->>'customer_id')::uuid; o_id uuid := (payload->>'order_id')::uuid; item jsonb; existing_rep uuid; total_value numeric := 0;
BEGIN
 IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'rep') OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 SELECT rep_id INTO existing_rep FROM public.visits WHERE id=v_id;
 IF FOUND THEN
   IF existing_rep <> auth.uid() THEN RAISE EXCEPTION 'Not authorized'; END IF;
   RETURN v_id;
 END IF;
 IF (payload->>'new_customer')::boolean THEN
   INSERT INTO public.customers(id,name,phone,address,lat,lng) VALUES(c_id,payload->>'name',payload->>'phone',nullif(payload->>'address',''),(payload->>'lat')::double precision,(payload->>'lng')::double precision);
 END IF;
 IF coalesce(payload->>'photo_path','') NOT LIKE auth.uid()::text || '/%' THEN RAISE EXCEPTION 'Invalid photo'; END IF;
 IF (payload->>'has_order')::boolean THEN
   IF jsonb_array_length(payload->'items')=0 THEN RAISE EXCEPTION 'No products'; END IF;
   FOR item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
     IF (item->>'qty')::numeric <= 0 OR NOT EXISTS(SELECT 1 FROM public.products WHERE id=(item->>'product_id')::uuid) THEN RAISE EXCEPTION 'Invalid product or quantity'; END IF;
     total_value := total_value + (item->>'qty')::numeric * (SELECT price FROM public.products WHERE id=(item->>'product_id')::uuid);
   END LOOP;
 END IF;
 INSERT INTO public.visits(id,customer_id,rep_id,photo_path,lat,lng,note,has_order,created_at) VALUES(v_id,c_id,auth.uid(),payload->>'photo_path',(payload->>'lat')::double precision,(payload->>'lng')::double precision,nullif(payload->>'note',''),(payload->>'has_order')::boolean,(payload->>'captured_at')::timestamptz);
 IF (payload->>'has_order')::boolean THEN
   INSERT INTO public.orders(id,customer_id,visit_id,rep_id,phone,address,lat,lng,delivery_at,notes,total) VALUES(o_id,c_id,v_id,auth.uid(),payload->>'phone',nullif(payload->>'address',''),(payload->>'lat')::double precision,(payload->>'lng')::double precision,nullif(payload->>'delivery_at','')::timestamptz,nullif(payload->>'note',''),total_value);
   INSERT INTO public.order_items(order_id,product_id,qty,price) SELECT o_id,p.id,(x->>'qty')::numeric,p.price FROM jsonb_array_elements(payload->'items') x JOIN public.products p ON p.id=(x->>'product_id')::uuid;
 END IF;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.sync_field_record(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_field_record(jsonb) TO authenticated;
CREATE INDEX IF NOT EXISTS visits_rep_created_idx ON public.visits(rep_id,created_at DESC);
CREATE INDEX IF NOT EXISTS orders_rep_created_idx ON public.orders(rep_id,created_at DESC);