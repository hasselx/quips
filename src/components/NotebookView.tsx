import { useState, useMemo, useEffect, useRef } from "react";
import { ArrowLeft, Plus, Download, Image as ImageIcon, Loader2, PieChart, BarChart3 } from "lucide-react";
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
import { CategoryBarChart } from "@/components/CategoryBarChart";
import { useCustomCategories } from "@/hooks/useCustomCategories";
import { AIInsightsCard } from "@/components/AIInsightsCard";
import { compressReceiptImage } from "@/lib/receiptImage";
import { getCurrency } from "@/lib/currency";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [barChartOpen, setBarChartOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const { allCategories, addCategory } = useCustomCategories();
  const [receiptStatus, setReceiptStatus] = useState<"idle" | "processing" | "adding">("idle");
  const [prefillData, setPrefillData] = useState<{ name: string; category: string; amount: number; date: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptBusy = receiptStatus !== "idle";

  const { data: liveNotebook } = useQuery({
    queryKey: ["notebook", notebook.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("notebooks").select("*").eq("id", notebook.id).maybeSingle();
      if (error) throw error;
      return data as Notebook | null;
    },
    initialData: notebook,
  });
  const activeNotebook = liveNotebook ?? notebook;
  const notebookCurrency = getCurrency((activeNotebook as any).currency);

  // Auto-copy recurring bills when opening a recurring notebook
  useEffect(() => {
    if ((notebook as any).type === "Recurring Bills") {
      const copyRecurring = async () => {
        try {
          const { data, error } = await supabase.functions.invoke("copy-recurring-bills", {
            body: { notebook_id: notebook.id },
          });
          if (!error && data?.copied > 0) {
            toast.success(`${data.copied} recurring bills copied to this month`);
            queryClient.invalidateQueries({ queryKey: ["expenses", notebook.id] });
          }
        } catch {
          // Silently fail - not critical
        }
      };
      copyRecurring();
    }
  }, [notebook.id]);

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

  const clearAnalysesOnChange = async () => {
    // Clear notebook-specific and global analytics cache
    await supabase.from("ai_analyses").delete().eq("notebook_id", notebook.id);
    await supabase.from("ai_analyses").delete().eq("notebook_id", "all-notebooks-global");
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["expenses", notebook.id] });
    queryClient.invalidateQueries({ queryKey: ["notebook-counts"] });
    queryClient.invalidateQueries({ queryKey: ["all-expenses-analytics"] });
    clearAnalysesOnChange();
  };

  const addMutation = useMutation({
    mutationFn: async (data: { name: string; category: string; amount: number; date: string; description?: string }) => {
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
    mutationFn: async ({ id, data }: { id: string; data: { name: string; category: string; amount: number; date: string; description?: string } }) => {
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

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image too large (max 10MB)");
      return;
    }

    setReceiptStatus("processing");
    toast.info("Scanning receipt...");

    try {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      const { base64, mimeType } = await compressReceiptImage(file);

      const { data, error } = await supabase.functions.invoke("parse-receipt", {
        body: { imageBase64: base64, mimeType },
      });

      if (error) throw error;
      if (data?.expense) {
        setReceiptStatus("adding");
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
        setPrefillData(data.expense);
        setFormOpen(true);
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
        toast.success("Receipt parsed! Review the details.");
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to parse receipt");
    } finally {
      setReceiptStatus("idle");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-24">
        {/* Header */}
        <div className="flex items-center gap-1.5 sm:gap-3 mb-4 sm:mb-6">
          <Button variant="ghost" size="icon" className="rounded-xl shrink-0 h-9 w-9 sm:h-10 sm:w-10" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-extrabold text-foreground truncate">{notebook.name}</h1>
          </div>
          <Button variant="outline" size="icon" className="rounded-xl shrink-0 h-9 w-9 sm:h-10 sm:w-10" onClick={() => setChartOpen(true)} title="Pie chart">
            <PieChart className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl shrink-0 h-9 w-9 sm:h-10 sm:w-10" onClick={() => setBarChartOpen(true)} title="Bar chart">
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl shrink-0 h-9 w-9 sm:h-10 sm:w-10" onClick={exportCSV} title="Export CSV">
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Period Tabs */}
        <Tabs
          value={filters.timeRange === "week" || filters.timeRange === "month" ? filters.timeRange : "all"}
          onValueChange={(v) => setFilters({ ...filters, timeRange: v })}
          className="mb-4"
        >
          <TabsList className="grid w-full grid-cols-3 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg text-xs sm:text-sm">All Time</TabsTrigger>
            <TabsTrigger value="month" className="rounded-lg text-xs sm:text-sm">This Month</TabsTrigger>
            <TabsTrigger value="week" className="rounded-lg text-xs sm:text-sm">This Week</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* AI Insights */}
        <div className="mb-4">
          <AIInsightsCard expenses={expenses} notebookName={notebook.name} notebookId={notebook.id} currency={notebookCurrency.code} period={filters.timeRange === "week" || filters.timeRange === "month" ? filters.timeRange : "all"} />
        </div>

        {/* Dashboard */}
        <div className="mb-4">
          <DashboardSummary total={total} count={filteredExpenses.length} topCategory={topCategory} onTotalClick={() => setChartOpen(true)} customCategories={allCategories} currency={notebookCurrency.code} />
        </div>

        {/* Filters */}
        <div className="mb-4">
          <ExpenseFilters filters={filters} onChange={setFilters} categories={allCategories} />
        </div>

        {/* Table */}
        <ExpenseTable expenses={filteredExpenses} onEdit={handleEdit} onDelete={(id) => deleteMutation.mutate(id)} customCategories={allCategories} currency={notebookCurrency.code} />
      </div>

      {/* Hidden file input for receipt scanning */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReceiptUpload}
      />

      {receiptBusy && (
        <div className="fixed inset-x-4 bottom-36 z-40 md:bottom-24">
          <div className="mx-auto max-w-sm rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-elevated backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {receiptStatus === "processing" ? "Processing receipt" : "Adding details"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {receiptStatus === "processing"
                    ? "Compressing and analyzing your photo..."
                    : "Opening the expense form with the extracted details..."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FABs */}
      <div className="fixed bottom-20 right-6 flex flex-col gap-3 z-40 md:bottom-6">
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={receiptBusy}
          variant="outline"
          className="h-12 w-12 rounded-full shadow-elevated bg-background"
          size="icon"
          title="Scan receipt"
        >
          {receiptBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
        </Button>
        <Button onClick={() => setFormOpen(true)} disabled={receiptBusy} className="h-14 w-14 rounded-full shadow-elevated text-lg" size="icon">
          <Plus className="h-7 w-7" />
        </Button>
      </div>

      {/* Form */}
      <ExpenseForm
        open={formOpen}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
        editExpense={editExpense}
        prefillData={prefillData}
        categories={allCategories}
        onAddCustomCategory={handleAddCustomCategory}
        currencySymbol={notebookCurrency.symbol}
      />

      {/* Pie Chart */}
      <CategoryPieChart open={chartOpen} onOpenChange={setChartOpen} expenses={filteredExpenses} currency={notebookCurrency.code} />
      <CategoryBarChart open={barChartOpen} onOpenChange={setBarChartOpen} expenses={filteredExpenses} currency={notebookCurrency.code} />
    </div>
  );
}
