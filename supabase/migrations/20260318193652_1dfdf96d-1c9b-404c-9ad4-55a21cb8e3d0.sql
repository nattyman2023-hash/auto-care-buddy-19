ALTER TABLE public.profiles ADD COLUMN skills text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN postcode text DEFAULT '';