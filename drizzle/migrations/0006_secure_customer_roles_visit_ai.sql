CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _role app_role, _enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _enabled AND _role='customer' AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('admin','rep','warehouse','driver')) THEN RAISE EXCEPTION 'دور العميل مستقل عن أدوار الموظفين'; END IF;
  IF _enabled AND _role IN ('admin','rep','warehouse','driver') AND public.has_role(_user_id,'customer') THEN RAISE EXCEPTION 'أزل دور العميل قبل تعيين دور وظيفي'; END IF;
  IF _enabled THEN INSERT INTO public.user_roles(user_id,role) VALUES(_user_id,_role) ON CONFLICT DO NOTHING;
  ELSE DELETE FROM public.user_roles WHERE user_id=_user_id AND role=_role; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.save_visit_ai_summary(_visit_id uuid, _summary text, _follow_up text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.visits v WHERE v.id=_visit_id AND (v.rep_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse'))) THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  UPDATE public.visits SET ai_summary=_summary, ai_follow_up=_follow_up WHERE id=_visit_id;
END $$;
REVOKE ALL ON FUNCTION public.save_visit_ai_summary(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_visit_ai_summary(uuid,text,text) TO authenticated, service_role;