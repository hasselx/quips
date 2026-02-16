import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_ICONS, CATEGORY_COLORS, type Category } from "@/types/expense";
import type { Tables } from "@/integrations/supabase/types";
import { motion, AnimatePresence } from "framer-motion";

type Expense = Tables<"expenses">;

interface ExpenseTableProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export function ExpenseTable({ expenses, onEdit, onDelete }: ExpenseTableProps) {
  if (expenses.length === 0) {
    return (
      <div className="bg-card rounded-2xl shadow-card p-12 text-center">
        <p className="text-4xl mb-3">💸</p>
        <p className="text-muted-foreground font-medium">No expenses yet</p>
        <p className="text-sm text-muted-foreground mt-1">Tap the + button to add your first expense</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-card overflow-hidden">
      <div className="hidden sm:grid grid-cols-[1fr_120px_100px_100px_80px] gap-2 px-5 py-3 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <span>Name</span>
        <span>Category</span>
        <span>Date</span>
        <span className="text-right">Amount</span>
        <span />
      </div>
      <div className="divide-y divide-border">
        <AnimatePresence>
          {expenses.map((expense) => {
            const cat = expense.category as Category;
            return (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px_100px_80px] gap-1 sm:gap-2 px-5 py-4 items-center hover:bg-muted/30 transition-colors group"
              >
                <div className="font-medium text-foreground">{expense.name}</div>
                <div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${CATEGORY_COLORS[cat] || "bg-gray-100 text-gray-700"}`}>
                    {CATEGORY_ICONS[cat] || "📌"} {expense.category}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(expense.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </div>
                <div className="text-right font-semibold text-foreground">
                  ₹{Number(expense.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="flex justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onEdit(expense)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={() => onDelete(expense.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
