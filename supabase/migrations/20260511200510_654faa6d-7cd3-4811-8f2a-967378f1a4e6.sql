ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS chair_id uuid REFERENCES public.chairs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_chair_id ON public.jobs(chair_id);