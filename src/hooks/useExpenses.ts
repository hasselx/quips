import { useState, useEffect, useCallback, useMemo } from "react";
import type { Expense, Category } from "@/types/expense";

const STORAGE_KEY = "expense-tracker-data";

function loadExpenses(): Expense[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveExpenses(expenses: Expense[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>(loadExpenses);

  useEffect(() => {
    saveExpenses(expenses);
  }, [expenses]);

  const addExpense = useCallback((expense: Omit<Expense, "id">) => {
    setExpenses((prev) => [
      { ...expense, id: crypto.randomUUID() },
      ...prev,
    ]);
  }, []);

  const updateExpense = useCallback((id: string, data: Omit<Expense, "id">) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...data, id } : e))
    );
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const categoryTotals = useMemo(() => {
    const map: Partial<Record<Category, number>> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return map;
  }, [expenses]);

  const topCategory = useMemo(() => {
    let max = 0;
    let cat: Category | null = null;
    Object.entries(categoryTotals).forEach(([k, v]) => {
      if (v && v > max) {
        max = v;
        cat = k as Category;
      }
    });
    return cat;
  }, [categoryTotals]);

  return {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    total,
    categoryTotals,
    topCategory,
  };
}
