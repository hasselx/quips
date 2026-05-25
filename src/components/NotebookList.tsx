import { useState } from "react";
import { Plus, BookOpen, Pencil, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";
import { CURRENCIES, formatCurrency } from "@/lib/currency";

type Notebook = Tables<"notebooks">;

interface NotebookListProps {
  onSelect: (notebook: Notebook) => void;
}

export function NotebookList({ onSelect }: NotebookListProps) {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editNotebook, setEditNotebook] = useState<Notebook | null>(null);
  const [name, setName] = useState("");
  const [notebookType, setNotebookType] = useState("Notebook");
  const [currency, setCurrency] = useState("INR");

  const NOTEBOOK_TYPES = ["Notebook", "Normal Expense", "Recurring Bills"];

  const { data: notebooks = [], isLoading } = useQuery({
    queryKey: ["notebooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notebooks")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Notebook[];
    },
  });

  const { data: expenseCounts = {} } = useQuery({
    queryKey: ["notebook-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("notebook_id, amount");
      if (error) throw error;
      const counts: Record<string, { count: number; total: number }> = {};
      data.forEach((e) => {
        if (!counts[e.notebook_id]) counts[e.notebook_id] = { count: 0, total: 0 };
        counts[e.notebook_id].count++;
        counts[e.notebook_id].total += Number(e.amount);
      });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ notebookName, type, currency }: { notebookName: string; type: string; currency: string }) => {
      const { error } = await supabase.from("notebooks").insert({ name: notebookName, user_id: user!.id, type, currency } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      toast.success("Notebook created!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, newName, type, currency }: { id: string; newName: string; type?: string; currency?: string }) => {
      const updateData: any = { name: newName };
      if (type) updateData.type = type;
      if (currency) updateData.currency = currency;
      const { error } = await supabase.from("notebooks").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["notebook", vars.id] });
      toast.success("Notebook updated!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notebooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["notebook-counts"] });
      toast.success("Notebook deleted!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editNotebook) {
      updateMutation.mutate({ id: editNotebook.id, newName: name.trim(), type: notebookType, currency });
    } else {
      createMutation.mutate({ notebookName: name.trim(), type: notebookType, currency });
    }
    setDialogOpen(false);
    setEditNotebook(null);
    setName("");
  };

  const openCreate = () => { setEditNotebook(null); setName(""); setNotebookType("Notebook"); setCurrency("INR"); setDialogOpen(true); };
  const openEdit = (nb: Notebook) => { setEditNotebook(nb); setName(nb.name); setNotebookType(nb.type || "Notebook"); setCurrency((nb as any).currency || "INR"); setDialogOpen(true); };

  const TYPE_CONFIG: Record<string, { emoji: string; borderClass: string; bgClass: string }> = {
    "Notebook": { emoji: "📒", borderClass: "border-l-amber-400", bgClass: "bg-amber-50 dark:bg-amber-950/20" },
    "Normal Expense": { emoji: "💳", borderClass: "border-l-emerald-400", bgClass: "bg-emerald-50 dark:bg-emerald-950/20" },
    "Recurring Bills": { emoji: "🔁", borderClass: "border-l-violet-400", bgClass: "bg-violet-50 dark:bg-violet-950/20" },
  };
  const FALLBACK_EMOJIS = ["📗", "📘", "📕", "📓", "📔"];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        {/* Landing Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">💰 ExpenseBook</h1>
          </div>
        </div>
        <p className="text-muted-foreground mb-8">
          Track expenses across multiple notebooks. Create one for every trip, month, or purpose.
        </p>

        {/* Notebooks */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : notebooks.length === 0 ? (
          <div className="bg-card rounded-2xl shadow-card p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No notebooks yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create one to start tracking expenses</p>
            <Button onClick={openCreate} className="mt-4 rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Create Notebook
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {notebooks.map((nb, i) => {
                const stats = expenseCounts[nb.id];
                return (
                  <motion.div
                    key={nb.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03 }}
                    className={`rounded-2xl shadow-card p-5 cursor-pointer hover:shadow-elevated transition-shadow relative group border-l-4 ${
                      (TYPE_CONFIG[nb.type] || TYPE_CONFIG["Notebook"]).borderClass
                    } ${(TYPE_CONFIG[nb.type] || TYPE_CONFIG["Notebook"]).bgClass}`}
                    onClick={() => onSelect(nb)}
                  >
                    <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-popover z-50" align="end">
                          <DropdownMenuItem onClick={() => openEdit(nb)}>
                            <Pencil className="h-4 w-4 mr-2" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(nb.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{(TYPE_CONFIG[nb.type] || TYPE_CONFIG["Notebook"]).emoji}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        nb.type === "Recurring Bills" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" :
                        nb.type === "Normal Expense" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" :
                        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      }`}>
                        {nb.type || "Notebook"}
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground text-lg">{nb.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {stats ? `${stats.count} expenses · ${formatCurrency(stats.total, (nb as any).currency)}` : "No expenses"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {formatDate(nb.updated_at)}
                    </p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* FAB */}
      <Button onClick={openCreate} className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-elevated text-lg z-40 md:bottom-6" size="icon">
        <Plus className="h-7 w-7" />
      </Button>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editNotebook ? "Rename Notebook" : "New Notebook"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {(
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Type</label>
                <Select
                  value={notebookType}
                  onValueChange={(val) => {
                    setNotebookType(val);
                    if (!name || NOTEBOOK_TYPES.includes(name)) {
                      setName(val);
                    }
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTEBOOK_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input
                placeholder="e.g. Trip to Delhi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                className="rounded-xl"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50 max-h-60 overflow-y-auto">
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full rounded-xl h-12 font-semibold">
              {editNotebook ? "Save" : "Create Notebook"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
