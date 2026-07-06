CREATE POLICY "Anon can insert messages"
ON public.messages
FOR INSERT
TO public
WITH CHECK (true);