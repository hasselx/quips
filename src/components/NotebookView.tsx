import { useState, useMemo } from "react";
import { ArrowLeft, Plus, Download } from "lucide-react";
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
import { ExpenseFilters, applyFilters, DEFAULT_FILTERS, type FilterState } from "@/components/ExpenseFilters";
import { CategoryPieChart } from "@/components/CategoryPieChart";
import { useCustomCategories } from "@/hooks/useCustomCategories";

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
  const [chartOpen, setChartOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const { allCategories, addCategory } = useCustomCategories();

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

  const filteredExpenses = useMemo(() => applyFilters(expenses, filters), [expenses, filters]);
  const total = useMemo(() => filteredExpenses.reduce((s, e) => s + Number(e.amount), 0), [filteredExpenses]);

  const topCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + Number(e.amount); });
    let max = 0, cat: string | null = null;
    Object.entries(map).forEach(([k, v]) => { if (v > max) { max = v; cat = k; } });
    return cat as Category | null;
  }, [filteredExpenses]);

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

  const handleAddCustomCategory = (name: string) => {
    addCategory.mutate(name);
  };

  const exportCSV = () => {
    const headers = ["Date", "Name", "Category", "Amount"];
    const rows = filteredExpenses.map((e) => [e.date, e.name, e.category, String(e.amount)]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${notebook.name}-expenses.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" className="rounded-xl shrink-0" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold text-foreground truncate">{notebook.name}</h1>
          </div>
          <Button variant="outline" size="icon" className="rounded-xl shrink-0" onClick={exportCSV} title="Export CSV">
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Dashboard */}
        <div className="mb-4">
          <DashboardSummary total={total} count={filteredExpenses.length} topCategory={topCategory} onTotalClick={() => setChartOpen(true)} customCategories={allCategories} />
        </div>

        {/* Filters */}
        <div className="mb-4">
          <ExpenseFilters filters={filters} onChange={setFilters} categories={allCategories} />
        </div>

        {/* Table */}
        <ExpenseTable expenses={filteredExpenses} onEdit={handleEdit} onDelete={(id) => deleteMutation.mutate(id)} customCategories={allCategories} />
      </div>

      {/* FAB */}
      <Button onClick={() => setFormOpen(true)} className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-elevated text-lg z-40" size="icon">
        <Plus className="h-7 w-7" />
      </Button>

      {/* Form */}
      <ExpenseForm
        open={formOpen}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
        editExpense={editExpense}
        categories={allCategories}
        onAddCustomCategory={handleAddCustomCategory}
      />

      {/* Pie Chart */}
      <CategoryPieChart open={chartOpen} onOpenChange={setChartOpen} expenses={filteredExpenses} />
    </div>
  );
}
