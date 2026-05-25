import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import type { Tables } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/currency";

type Expense = Tables<"expenses">;

const COLORS = [
  "hsl(25, 80%, 55%)",
  "hsl(210, 70%, 55%)",
  "hsl(340, 65%, 55%)",
  "hsl(45, 85%, 50%)",
  "hsl(270, 55%, 55%)",
  "hsl(160, 55%, 42%)",
  "hsl(190, 60%, 50%)",
  "hsl(0, 65%, 55%)",
];

interface CategoryBarChartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: Expense[];
  currency?: string;
}

export function CategoryBarChart({ open, onOpenChange, expenses, currency }: CategoryBarChartProps) {
  const categoryMap: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + Number(e.amount);
  });

  const data = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Spending by Category</DialogTitle>
        </DialogHeader>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No expenses to chart</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v, currency, { compact: true })} fontSize={11} />
                <YAxis type="category" dataKey="name" width={90} fontSize={12} />
                <Tooltip formatter={(value: number) => formatCurrency(value, currency)} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
