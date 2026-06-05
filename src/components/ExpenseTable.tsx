import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCategoryIcon, CATEGORY_COLORS, type Category } from "@/types/expense";
import type { Tables } from "@/integrations/supabase/types";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/currency";

type Expense = Tables<"expenses">;

interface ExpenseTableProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  customCategories?: string[];
  currency?: string;
}

export function ExpenseTable({ expenses, onEdit, onDelete, customCategories = [], currency }: ExpenseTableProps) {
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
                className="hidden sm:grid sm:grid-cols-[1fr_120px_100px_100px_80px] gap-2 px-5 py-4 items-center hover:bg-muted/30 transition-colors group"
              >
                <div className="font-medium text-foreground truncate">{expense.name}</div>
                <div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${CATEGORY_COLORS[cat] || "bg-gray-100 text-gray-700"}`}>
                    {getCategoryIcon(expense.category, customCategories)} {expense.category}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(expense.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </div>
                <div className="text-right font-semibold text-foreground">
                  {formatCurrency(Number(expense.amount), currency)}
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
          {/* Mobile compact rows */}
          {expenses.map((expense) => {
            const cat = expense.category as Category;
            return (
              <motion.div
                key={`m-${expense.id}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="sm:hidden px-3 py-2.5 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm text-foreground truncate min-w-0 flex-1">{expense.name}</p>
                  <p className="text-sm font-bold text-foreground shrink-0">{formatCurrency(Number(expense.amount), currency)}</p>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${CATEGORY_COLORS[cat] || "bg-gray-100 text-gray-700"}`}>
                      {getCategoryIcon(expense.category, customCategories)} {expense.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(expense.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => onEdit(expense)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-destructive hover:text-destructive" onClick={() => onDelete(expense.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
