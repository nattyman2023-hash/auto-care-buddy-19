
-- Add started_at and completed_at to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Add pay_rate and is_active to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pay_rate numeric DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create job_notes table
CREATE TABLE IF NOT EXISTS public.job_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id),
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access job_notes" ON public.job_notes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Mechanics can manage own job_notes" ON public.job_notes FOR ALL USING (has_role(auth.uid(), 'mechanic'::app_role) AND author_id = auth.uid());

-- Create trigger: when invoice status changes to 'paid', sync job status to 'paid'
CREATE OR REPLACE FUNCTION public.on_invoice_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.jobs SET status = 'paid' WHERE id = NEW.job_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER invoices_status_sync
AFTER UPDATE ON public.invoices
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.on_invoice_status_change();
