import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

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

interface CategoryPieChartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: Expense[];
}

export function CategoryPieChart({ open, onOpenChange, expenses }: CategoryPieChartProps) {
  const categoryMap: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + Number(e.amount);
  });

  const total = Object.values(categoryMap).reduce((s, v) => s + v, 0);

  const data = Object.entries(categoryMap)
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
      percent: total > 0 ? ((value / total) * 100).toFixed(1) : "0",
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Spending by Category</DialogTitle>
        </DialogHeader>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No expenses to chart</p>
        ) : (
          <div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={false}
                    labelLine={false}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-4 px-2">
              {data.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5 text-sm">
                  <span
                    className="inline-block w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-foreground">{item.name}</span>
                  <span className="text-muted-foreground">{item.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
