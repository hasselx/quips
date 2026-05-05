import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";

type Expense = Tables<"expenses">;

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; category: string; amount: number; date: string; description?: string }) => void;
  editExpense?: Expense | null;
  prefillData?: { name: string; category: string; amount: number; date: string; description?: string } | null;
  categories: string[];
  onAddCustomCategory?: (name: string) => void;
  currencySymbol?: string;
}

export function ExpenseForm({ open, onOpenChange, onSubmit, editExpense, prefillData, categories, onAddCustomCategory, currencySymbol = "₹" }: ExpenseFormProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Food");
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (editExpense) {
      setName(editExpense.name);
      setCategory(editExpense.category);
      setShowCustomInput(false);
      setCustomCategory("");
      setAmount(String(editExpense.amount));
      setDate(editExpense.date);
      setDescription((editExpense as any).description || "");
    } else if (prefillData) {
      setName(prefillData.name || "");
      setCategory(prefillData.category || "Other");
      setShowCustomInput(false);
      setCustomCategory("");
      setAmount(prefillData.amount ? String(prefillData.amount) : "");
      setDate(prefillData.date || new Date().toISOString().split("T")[0]);
      setDescription(prefillData.description || "");
    } else {
      setName("");
      setCategory("Food");
      setShowCustomInput(false);
      setCustomCategory("");
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      setDescription("");
    }
  }, [editExpense, prefillData, open]);

  const handleCategoryChange = (val: string) => {
    if (val === "__other__") {
      setShowCustomInput(true);
      setCategory("Other");
    } else {
      setShowCustomInput(false);
      setCategory(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || Number(amount) <= 0) return;

    let finalCategory = category;
    if (showCustomInput && customCategory.trim()) {
      finalCategory = customCategory.trim();
      onAddCustomCategory?.(finalCategory);
    }

    onSubmit({
      name: name.trim(),
      category: finalCategory,
      amount: parseFloat(Number(amount).toFixed(2)),
      date,
      description: description.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {editExpense ? "Edit Expense" : "Add Expense"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="expense-name">Expense Name</Label>
            <Input id="expense-name" placeholder="e.g. Coffee" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-category">Category</Label>
            <Select value={showCustomInput ? "__other__" : category} onValueChange={handleCategoryChange}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50 max-h-60 overflow-y-auto">
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
                <SelectItem value="__other__">+ Add Custom Category</SelectItem>
              </SelectContent>
            </Select>
            {showCustomInput && (
              <Input
                placeholder="Enter custom category name"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="rounded-xl mt-2"
                autoFocus
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-amount">Amount (₹)</Label>
            <Input id="expense-amount" type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-date">Date</Label>
            <Input id="expense-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-description">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea id="expense-description" placeholder="Add notes about this expense..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} className="rounded-xl resize-none" rows={2} />
          </div>
          <Button type="submit" className="w-full rounded-xl h-12 text-base font-semibold">
            {editExpense ? "Save Changes" : "Add Expense"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
