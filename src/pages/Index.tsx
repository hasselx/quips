import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExpenses } from "@/hooks/useExpenses";
import { DashboardSummary } from "@/components/DashboardSummary";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseTable } from "@/components/ExpenseTable";
import type { Expense } from "@/types/expense";

const Index = () => {
  const { expenses, addExpense, updateExpense, deleteExpense, total, topCategory } = useExpenses();
  const [formOpen, setFormOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

  const handleEdit = (expense: Expense) => {
    setEditExpense(expense);
    setFormOpen(true);
  };

  const handleSubmit = (data: Omit<Expense, "id">) => {
    if (editExpense) {
      updateExpense(editExpense.id, data);
      setEditExpense(null);
    } else {
      addExpense(data);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditExpense(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            💰 Expense Tracker
          </h1>
          <p className="text-muted-foreground mt-1">Track your spending, stay on budget.</p>
        </div>

        {/* Dashboard */}
        <div className="mb-6">
          <DashboardSummary total={total} count={expenses.length} topCategory={topCategory} />
        </div>

        {/* Table */}
        <ExpenseTable expenses={expenses} onEdit={handleEdit} onDelete={deleteExpense} />
      </div>

      {/* FAB */}
      <Button
        onClick={() => setFormOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-elevated text-lg z-40"
        size="icon"
      >
        <Plus className="h-7 w-7" />
      </Button>

      {/* Form Dialog */}
      <ExpenseForm
        open={formOpen}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
        editExpense={editExpense}
      />
    </div>
  );
};

export default Index;
