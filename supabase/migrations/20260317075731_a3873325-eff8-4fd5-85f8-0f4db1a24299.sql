ALTER TABLE public.jobs ADD COLUMN pay_type text NOT NULL DEFAULT 'hourly';
ALTER TABLE public.jobs ADD COLUMN pay_amount numeric DEFAULT NULL;