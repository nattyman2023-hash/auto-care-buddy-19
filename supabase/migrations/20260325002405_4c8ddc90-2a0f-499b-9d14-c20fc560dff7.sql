CREATE POLICY "Anon can insert leads"
ON public.leads FOR INSERT
WITH CHECK (true);