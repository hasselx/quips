import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PiggyBank, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
}

export default function SavingsGoals({ currency, net }: { currency: string; net: number }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");

  const { data: goals = [] } = useQuery({
    queryKey: ["savings-goals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("savings_goals").select("*").order("created_at");
      if (error) throw error;
      return data as Goal[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["savings-goals"] });

  const addGoal = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("savings_goals").insert({
        user_id: user.id,
        name: name.trim(),
        target_amount: Number(target) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setName("");
      setTarget("");
      toast.success("Savings goal added");
    },
    onError: () => toast.error("Could not add goal"),
  });

  const addSavings = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const goal = goals.find((g) => g.id === id);
      if (!goal) return;
      const { error } = await supabase
        .from("savings_goals")
        .update({ saved_amount: Number(goal.saved_amount) + amount })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("savings_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return (
    <div className="bg-card rounded-2xl p-4 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-1.5">
          <PiggyBank className="h-4 w-4 text-primary" /> Savings goals
        </h2>
        <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Set an amount you'd like to save for something — a trip, a gadget, an emergency fund.
        </p>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const pct = g.target_amount > 0 ? Math.min(100, (Number(g.saved_amount) / Number(g.target_amount)) * 100) : 0;
            return (
              <div key={g.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="font-medium truncate">{g.name}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold">
                      {formatCurrency(Number(g.saved_amount), currency)} / {formatCurrency(Number(g.target_amount), currency)}
                    </span>
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteGoal.mutate(g.id)}
                      aria-label="Delete goal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{pct.toFixed(0)}% saved</span>
                  {net > 0 && Number(g.saved_amount) < Number(g.target_amount) && (
                    <button
                      className="text-[11px] text-primary font-medium"
                      onClick={() => addSavings.mutate({ id: g.id, amount: Math.min(net, Number(g.target_amount) - Number(g.saved_amount)) })}
                    >
                      Allocate {formatCurrency(Math.min(net, Number(g.target_amount) - Number(g.saved_amount)), currency)} from net savings
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>New savings goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="What are you saving for?" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            <Input placeholder={`Target amount (${currency})`} type="number" min="0" value={target} onChange={(e) => setTarget(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={!name.trim() || !(Number(target) > 0) || addGoal.isPending} onClick={() => addGoal.mutate()}>
                Save goal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
