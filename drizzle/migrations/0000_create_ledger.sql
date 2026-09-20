CREATE TABLE public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'lent',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ledger_entries TO authenticated;
GRANT ALL ON public.ledger_entries TO service_role;

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ledger entries" ON public.ledger_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own ledger entries" ON public.ledger_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ledger entries" ON public.ledger_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ledger entries" ON public.ledger_entries FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_ledger_entries_user_person ON public.ledger_entries (user_id, person_name);

CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'EUR',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
