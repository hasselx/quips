CREATE TABLE public.income_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id uuid NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Salary',
  amount numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_entries TO authenticated;
GRANT ALL ON public.income_entries TO service_role;

ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own income"
ON public.income_entries FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own income"
ON public.income_entries FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income"
ON public.income_entries FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own income"
ON public.income_entries FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_income_entries_updated_at
BEFORE UPDATE ON public.income_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.income_entries (
  id, notebook_id, user_id, name, category, amount, date, description, created_at, updated_at
)
SELECT
  e.id, e.notebook_id, e.user_id, e.name, e.category, e.amount, e.date, e.description, e.created_at, e.updated_at
FROM public.expenses e
JOIN public.notebooks n ON n.id = e.notebook_id
WHERE n.type = 'Income'
ON CONFLICT (id) DO NOTHING;

CREATE INDEX income_entries_notebook_id_idx ON public.income_entries(notebook_id);
CREATE INDEX income_entries_user_id_idx ON public.income_entries(user_id);