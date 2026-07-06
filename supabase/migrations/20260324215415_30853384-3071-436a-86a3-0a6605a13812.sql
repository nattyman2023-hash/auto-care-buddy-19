
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  vrm text DEFAULT '',
  service_requested text DEFAULT '',
  source text NOT NULL DEFAULT 'Web',
  status text NOT NULL DEFAULT 'New',
  priority text NOT NULL DEFAULT 'Medium',
  ai_score integer NOT NULL DEFAULT 0,
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  estimated_price numeric NOT NULL DEFAULT 0,
  parts_cost_estimate numeric NOT NULL DEFAULT 0,
  labor_estimate numeric NOT NULL DEFAULT 0,
  valid_until date,
  status text NOT NULL DEFAULT 'Pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lead_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'Note',
  content text NOT NULL DEFAULT '',
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access leads" ON public.leads FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Mechanics can view assigned leads" ON public.leads FOR SELECT USING (public.has_role(auth.uid(), 'mechanic') AND assigned_to = auth.uid());

CREATE POLICY "Admins full access quotes" ON public.quotes FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can view quotes by id" ON public.quotes FOR SELECT TO public USING (true);

CREATE POLICY "Admins full access lead_interactions" ON public.lead_interactions FOR ALL USING (public.has_role(auth.uid(), 'admin'));
