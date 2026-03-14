import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCustomCategories } from "@/hooks/useCustomCategories";
import type { Tables } from "@/integrations/supabase/types";
import { getCategoryIcon } from "@/types/expense";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, PieChart as PieChartIcon, BarChart3, Brain, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from "recharts";
import { AIInsightsCard } from "@/components/AIInsightsCard";
import { toast } from "sonner";

type Expense = Tables<"expenses">;
type Notebook = Tables<"notebooks">;

const CHART_COLORS = [
  "hsl(160, 60%, 38%)", "hsl(30, 80%, 55%)", "hsl(210, 80%, 52%)",
  "hsl(0, 72%, 51%)", "hsl(280, 60%, 50%)", "hsl(45, 90%, 50%)",
  "hsl(180, 50%, 45%)", "hsl(330, 60%, 50%)",
];

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { allCategories } = useCustomCategories();
  const [scope, setScope] = useState<"all" | string>("all");

  const { data: notebooks = [] } = useQuery({
    queryKey: ["notebooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notebooks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Notebook[];
    },
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ["all-expenses-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;
      return data as Expense[];
    },
  });

  const expenses = useMemo(() => {
    if (scope === "all") return allExpenses;
    return allExpenses.filter((e) => e.notebook_id === scope);
  }, [allExpenses, scope]);

  const selectedNotebook = notebooks.find((n) => n.id === scope);

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + Number(e.amount);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, amount]) => {
        const [y, m] = key.split("-");
        return { month: `${MONTHS_SHORT[parseInt(m) - 1]} ${y.slice(2)}`, amount };
      });
  }, [expenses]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [expenses]);

  // Daily spending for heatmap (last 90 days)
  const dailySpending = useMemo(() => {
    const now = new Date();
    const days: { date: string; amount: number; day: number; week: number }[] = [];
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.date] = (map[e.date] || 0) + Number(e.amount);
    });

    for (let i = 89; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days.push({
        date: key,
        amount: map[key] || 0,
        day: d.getDay(),
        week: Math.floor((89 - i) / 7),
      });
    }
    return days;
  }, [expenses]);

  const maxDaily = useMemo(() => Math.max(...dailySpending.map((d) => d.amount), 1), [dailySpending]);

  // Week over week comparison
  const weeklyComparison = useMemo(() => {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    let thisWeek = 0, lastWeek = 0;
    expenses.forEach((e) => {
      const d = new Date(e.date);
      if (d >= thisWeekStart) thisWeek += Number(e.amount);
      else if (d >= lastWeekStart && d < thisWeekStart) lastWeek += Number(e.amount);
    });

    const change = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;
    return { thisWeek, lastWeek, change };
  }, [expenses]);

  // Monthly forecast
  const forecast = useMemo(() => {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const thisMonthTotal = expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + Number(e.amount), 0);

    const projected = dayOfMonth > 0 ? (thisMonthTotal / dayOfMonth) * daysInMonth : 0;
    return { current: thisMonthTotal, projected, daysLeft: daysInMonth - dayOfMonth };
  }, [expenses]);

  const total = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  const exportCSV = () => {
    const headers = ["Date", "Name", "Category", "Amount"];
    const rows = expenses.map((e) => [e.date, e.name, e.category, String(e.amount)]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${scope === "all" ? "all" : selectedNotebook?.name || scope}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  const formatINR = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-extrabold text-foreground">Analytics</h1>
        <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={exportCSV}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </div>
      <p className="text-muted-foreground text-sm mb-5">Deep dive into your spending</p>

      {/* Scope selector */}
      <div className="mb-6">
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="rounded-xl max-w-xs">
            <SelectValue placeholder="All notebooks" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">All Notebooks</SelectItem>
            {notebooks.map((n) => (
              <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* AI Insights */}
      <div className="mb-6">
        <AIInsightsCard expenses={expenses} notebookName={scope === "all" ? undefined : selectedNotebook?.name} />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-4 shadow-card">
          <p className="text-xs text-muted-foreground font-medium">Total</p>
          <p className="text-lg font-bold text-foreground">{formatINR(total)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-2xl p-4 shadow-card">
          <p className="text-xs text-muted-foreground font-medium">This Week</p>
          <p className="text-lg font-bold text-foreground">{formatINR(weeklyComparison.thisWeek)}</p>
          <p className={`text-xs font-medium ${weeklyComparison.change > 0 ? "text-destructive" : "text-primary"}`}>
            {weeklyComparison.change > 0 ? "↑" : "↓"} {Math.abs(weeklyComparison.change).toFixed(0)}% vs last week
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-4 shadow-card">
          <p className="text-xs text-muted-foreground font-medium">Month Forecast</p>
          <p className="text-lg font-bold text-foreground">{formatINR(forecast.projected)}</p>
          <p className="text-xs text-muted-foreground">{forecast.daysLeft} days left</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl p-4 shadow-card">
          <p className="text-xs text-muted-foreground font-medium">Transactions</p>
          <p className="text-lg font-bold text-foreground">{expenses.length}</p>
          <p className="text-xs text-muted-foreground">{categoryData.length} categories</p>
        </motion.div>
      </div>

      {/* Spending Trend */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Monthly Spending Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [formatINR(v), "Spent"]}
                />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown + Heatmap */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-accent" /> Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => [formatINR(v), ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2">
                  {categoryData.slice(0, 5).map((c, i) => (
                    <span key={c.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {getCategoryIcon(c.name, allCategories)} {c.name}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Heatmap */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-info" /> Daily Heatmap (90 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-13 gap-[3px]">
              {dailySpending.map((d) => {
                const intensity = d.amount > 0 ? Math.max(0.15, d.amount / maxDaily) : 0;
                return (
                  <div
                    key={d.date}
                    className="aspect-square rounded-[2px] border border-border/30"
                    style={{
                      background: intensity > 0
                        ? `hsl(160 60% 38% / ${intensity})`
                        : "hsl(var(--muted))",
                    }}
                    title={`${d.date}: ₹${d.amount.toLocaleString("en-IN")}`}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1">
                {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                  <div key={v} className="h-3 w-3 rounded-[2px]" style={{ background: v === 0 ? "hsl(var(--muted))" : `hsl(160 60% 38% / ${v})` }} />
                ))}
              </div>
              <span>More</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Bar Chart */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Top 5 Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={80} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [formatINR(v), "Spent"]}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {categoryData.slice(0, 5).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
          )}
        </CardContent>
      </Card>

      {/* Forecast Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Brain className="h-4 w-4 text-accent" /> Monthly Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Spent so far</p>
              <p className="text-2xl font-bold text-foreground">{formatINR(forecast.current)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Projected total</p>
              <p className="text-2xl font-bold text-primary">{formatINR(forecast.projected)}</p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${forecast.projected > 0 ? Math.min((forecast.current / forecast.projected) * 100, 100) : 0}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{forecast.daysLeft} days remaining this month</p>
        </CardContent>
      </Card>
    </div>
  );
}
