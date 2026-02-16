import { DollarSign, Hash, TrendingUp } from "lucide-react";
import type { Category } from "@/types/expense";
import { CATEGORY_ICONS } from "@/types/expense";

interface DashboardSummaryProps {
  total: number;
  count: number;
  topCategory: Category | null;
}

export function DashboardSummary({ total, count, topCategory }: DashboardSummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-card rounded-2xl p-5 shadow-card flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <DollarSign className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground font-medium">Total Spent</p>
          <p className="text-2xl font-bold text-foreground">₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-card flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
          <Hash className="h-6 w-6 text-info" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground font-medium">Entries</p>
          <p className="text-2xl font-bold text-foreground">{count}</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-card flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
          <TrendingUp className="h-6 w-6 text-accent" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground font-medium">Top Category</p>
          <p className="text-2xl font-bold text-foreground">
            {topCategory ? `${CATEGORY_ICONS[topCategory]} ${topCategory}` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
