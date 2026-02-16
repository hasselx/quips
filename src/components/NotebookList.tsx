import { useState } from "react";
import { Plus, BookOpen, Pencil, Trash2, MoreVertical, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";

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

  // Also fetch expense counts per notebook
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
    mutationFn: async (notebookName: string) => {
      const { error } = await supabase.from("notebooks").insert({ name: notebookName, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      toast.success("Notebook created!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName: string }) => {
      const { error } = await supabase.from("notebooks").update({ name: newName }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      toast.success("Notebook renamed!");
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
      updateMutation.mutate({ id: editNotebook.id, newName: name.trim() });
    } else {
      createMutation.mutate(name.trim());
    }
    setDialogOpen(false);
    setEditNotebook(null);
    setName("");
  };

  const openCreate = () => {
    setEditNotebook(null);
    setName("");
    setDialogOpen(true);
  };

  const openEdit = (nb: Notebook) => {
    setEditNotebook(nb);
    setName(nb.name);
    setDialogOpen(true);
  };

  const NOTEBOOK_EMOJIS = ["📒", "📗", "📘", "📕", "📓", "📔"];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">💰 ExpenseBook</h1>
            <p className="text-muted-foreground mt-1">Your expense notebooks</p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={signOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {/* Notebooks grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : notebooks.length === 0 ? (
          <div className="bg-card rounded-2xl shadow-card p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No notebooks yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create one to start tracking expenses</p>
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
                    className="bg-card rounded-2xl shadow-card p-5 cursor-pointer hover:shadow-elevated transition-shadow relative group"
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
                    <div className="text-3xl mb-2">{NOTEBOOK_EMOJIS[i % NOTEBOOK_EMOJIS.length]}</div>
                    <h3 className="font-bold text-foreground text-lg">{nb.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {stats ? `${stats.count} expenses · ₹${stats.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "No expenses"}
                    </p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* FAB */}
      <Button onClick={openCreate} className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-elevated text-lg z-40" size="icon">
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
            <div className="space-y-2">
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
            <Button type="submit" className="w-full rounded-xl h-12 font-semibold">
              {editNotebook ? "Save" : "Create Notebook"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
