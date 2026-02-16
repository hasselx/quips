import { useState, useMemo } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";
import type { Category } from "@/types/expense";
import { DashboardSummary } from "@/components/DashboardSummary";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseTable } from "@/components/ExpenseTable";

type Notebook = Tables<"notebooks">;
type Expense = Tables<"expenses">;

interface NotebookViewProps {
  notebook: Notebook;
  onBack: () => void;
}

export function NotebookView({ notebook, onBack }: NotebookViewProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", notebook.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("notebook_id", notebook.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });

  const total = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  const topCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + Number(e.amount); });
    let max = 0, cat: string | null = null;
    Object.entries(map).forEach(([k, v]) => { if (v > max) { max = v; cat = k; } });
    return cat as Category | null;
  }, [expenses]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["expenses", notebook.id] });
    queryClient.invalidateQueries({ queryKey: ["notebook-counts"] });
  };

  const addMutation = useMutation({
    mutationFn: async (data: { name: string; category: string; amount: number; date: string }) => {
      const { error } = await supabase.from("expenses").insert({
        ...data,
        notebook_id: notebook.id,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Expense added!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; category: string; amount: number; date: string } }) => {
      const { error } = await supabase.from("expenses").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Expense updated!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Expense deleted!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (data: { name: string; category: string; amount: number; date: string }) => {
    if (editExpense) {
      updateMutation.mutate({ id: editExpense.id, data });
      setEditExpense(null);
    } else {
      addMutation.mutate(data);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditExpense(expense);
    setFormOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditExpense(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" className="rounded-xl shrink-0" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-foreground truncate">{notebook.name}</h1>
          </div>
        </div>

        {/* Dashboard */}
        <div className="mb-6">
          <DashboardSummary total={total} count={expenses.length} topCategory={topCategory} />
        </div>

        {/* Table */}
        <ExpenseTable expenses={expenses} onEdit={handleEdit} onDelete={(id) => deleteMutation.mutate(id)} />
      </div>

      {/* FAB */}
      <Button onClick={() => setFormOpen(true)} className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-elevated text-lg z-40" size="icon">
        <Plus className="h-7 w-7" />
      </Button>

      {/* Form */}
      <ExpenseForm open={formOpen} onOpenChange={handleOpenChange} onSubmit={handleSubmit} editExpense={editExpense} />
    </div>
  );
}
