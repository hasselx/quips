import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import { getCategoryIcon } from "@/types/expense";
import { useCustomCategories } from "@/hooks/useCustomCategories";
import { motion, AnimatePresence } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";

type Expense = Tables<"expenses">;
type Period = "all" | "yearly" | "monthly";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function SpendPage() {
  const now = new Date();
  const [period, setPeriod] = useState<Period>("all");
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const { allCategories } = useCustomCategories();

  const { data: expenses = [] } = useQuery({
    queryKey: ["all-expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });

  // Derive available years from data
  const availableYears = useMemo(() => {
    const years = new Set(expenses.map((e) => new Date(e.date).getFullYear()));
    years.add(now.getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [expenses]);

  const filtered = useMemo(() => {
    if (period === "yearly") {
      return expenses.filter((e) => new Date(e.date).getFullYear() === selectedYear);
    }
    if (period === "monthly") {
      return expenses.filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      });
    }
    return expenses;
  }, [expenses, period, selectedYear, selectedMonth]);

  const total = useMemo(() => filtered.reduce((s, e) => s + Number(e.amount), 0), [filtered]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, amount]) => ({ category: cat, amount }));
  }, [filtered]);

  const periodLabel =
    period === "all"
      ? "All Time"
      : period === "yearly"
        ? selectedYear.toString()
        : `${MONTHS[selectedMonth]} ${selectedYear}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      <h1 className="text-2xl font-extrabold text-foreground mb-1">Spend Overview</h1>
      <p className="text-muted-foreground text-sm mb-6">See where your money goes</p>

      {/* Period Tabs */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} className="mb-4">
        <TabsList className="grid w-full grid-cols-3 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg text-xs sm:text-sm">All Time</TabsTrigger>
          <TabsTrigger value="yearly" className="rounded-lg text-xs sm:text-sm">This Year</TabsTrigger>
          <TabsTrigger value="monthly" className="rounded-lg text-xs sm:text-sm">This Month</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Year & Month Selectors */}
      {period !== "all" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex gap-3 mb-6"
        >
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="rounded-xl flex-1">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {availableYears.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {period === "monthly" && (
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="rounded-xl flex-1">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <motion.div
          key={`total-${period}-${selectedYear}-${selectedMonth}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 shadow-card"
        >
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Total Spent</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
        </motion.div>

        <motion.div
          key={`count-${period}-${selectedYear}-${selectedMonth}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl p-4 shadow-card"
        >
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-info" />
            <span className="text-xs text-muted-foreground font-medium">Transactions</span>
          </div>
          <p className="text-xl font-bold text-foreground">{filtered.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{categoryBreakdown.length} categories</p>
        </motion.div>
      </div>

      {/* Category Breakdown */}
      <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-accent" />
        By Category
      </h2>

      {categoryBreakdown.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 shadow-card text-center">
          <p className="text-muted-foreground text-sm">No expenses for this period</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {categoryBreakdown.map(({ category, amount }, i) => {
              const pct = total > 0 ? (amount / total) * 100 : 0;
              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-xl p-3 shadow-card"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">
                      {getCategoryIcon(category, allCategories)} {category}
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.4, delay: i * 0.03 }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(1)}%</p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
