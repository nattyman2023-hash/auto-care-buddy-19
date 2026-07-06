
CREATE TABLE public.service_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL,
  addon_id uuid NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  discount_pct numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(service_id, addon_id),
  CHECK (service_id <> addon_id)
);

CREATE INDEX idx_service_addons_service ON public.service_addons(service_id);

ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read service_addons"
  ON public.service_addons FOR SELECT USING (true);

CREATE POLICY "Admins manage service_addons"
  ON public.service_addons FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.job_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  addon_service_id uuid NOT NULL,
  price_snapshot numeric NOT NULL DEFAULT 0,
  duration_minutes_snapshot int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_addons_job ON public.job_addons(job_id);

ALTER TABLE public.job_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access job_addons"
  ON public.job_addons FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon can insert job_addons"
  ON public.job_addons FOR INSERT WITH CHECK (true);

CREATE POLICY "Customers can view own job_addons"
  ON public.job_addons FOR SELECT
  USING (job_id IN (
    SELECT j.id FROM public.jobs j
    JOIN public.customers c ON c.id = j.customer_id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Mechanics can view assigned job_addons"
  ON public.job_addons FOR SELECT
  USING (has_role(auth.uid(), 'mechanic'::app_role) AND job_id IN (
    SELECT id FROM public.jobs WHERE assigned_to = auth.uid()
  ));
