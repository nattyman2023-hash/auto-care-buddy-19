
-- Create expenses table
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  description text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'other',
  receipt_path text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS: Admins full access
CREATE POLICY "Admins full access expenses" ON public.expenses
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: Employees can manage own expenses
CREATE POLICY "Users can manage own expenses" ON public.expenses
FOR ALL USING (employee_id = auth.uid())
WITH CHECK (employee_id = auth.uid());

-- Storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('expense-receipts', 'expense-receipts', true);

-- Storage RLS
CREATE POLICY "Admins full access expense receipts" ON storage.objects
FOR ALL USING (bucket_id = 'expense-receipts' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can upload own expense receipts" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'expense-receipts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view expense receipts" ON storage.objects
FOR SELECT USING (bucket_id = 'expense-receipts');
