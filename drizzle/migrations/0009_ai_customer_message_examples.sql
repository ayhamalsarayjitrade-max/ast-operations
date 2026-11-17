CREATE TABLE public.message_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  content text NOT NULL CHECK (char_length(content) BETWEEN 5 AND 3000),
  product_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.message_examples TO authenticated;
GRANT ALL ON public.message_examples TO service_role;
ALTER TABLE public.message_examples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read examples" ON public.message_examples FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rep') OR public.has_role(auth.uid(),'warehouse'));
CREATE POLICY "staff add own examples" ON public.message_examples FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rep') OR public.has_role(auth.uid(),'warehouse')));
CREATE POLICY "author or admin delete" ON public.message_examples FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));