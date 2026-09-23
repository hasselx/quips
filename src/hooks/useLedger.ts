import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

export type LedgerEntry = Tables<"ledger_entries">;
export type EntryType = "lent" | "borrowed" | "income";

export interface NewEntry {
  person_name: string;
  amount: number;
  type: EntryType;
  date: string;
  note: string;
}

export interface PersonSummary {
  name: string;
  balance: number; // positive = they owe me
  entries: LedgerEntry[];
}

export function useLedger() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["ledger-entries", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ledger_entries")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LedgerEntry[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ledger-entries"] });

  const addEntries = useMutation({
    mutationFn: async (rows: NewEntry[]) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("ledger_entries")
        .insert(rows.map((r) => ({ ...r, user_id: user.id })));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ledger_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const clearPerson = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("ledger_entries").delete().eq("person_name", name);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const people: PersonSummary[] = [];
  const map = new Map<string, PersonSummary>();
  for (const e of entries) {
    let p = map.get(e.person_name);
    if (!p) {
      p = { name: e.person_name, balance: 0, entries: [] };
      map.set(e.person_name, p);
      people.push(p);
    }
    p.entries.push(e);
    p.balance += (e.type === "lent" ? 1 : -1) * Number(e.amount);
  }
  people.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

  const owedToMe = people.reduce((s, p) => s + (p.balance > 0 ? p.balance : 0), 0);
  const iOwe = people.reduce((s, p) => s + (p.balance < 0 ? -p.balance : 0), 0);

  return {
    entries,
    people,
    owedToMe,
    iOwe,
    net: owedToMe - iOwe,
    isLoading,
    addEntries,
    deleteEntry,
    clearPerson,
  };
}

export function useUserCurrency() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: currency = "EUR" } = useQuery({
    queryKey: ["user-currency", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("currency")
        .maybeSingle();
      if (error) throw error;
      return data?.currency ?? "EUR";
    },
  });

  const setCurrency = useMutation({
    mutationFn: async (code: string) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("user_settings")
        .upsert({ user_id: user.id, currency: code, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-currency"] }),
  });

  return { currency, setCurrency };
}
