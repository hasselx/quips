import { DollarSign, Hash, TrendingUp } from "lucide-react";
import { CATEGORY_ICONS, type Category } from "@/types/expense";
import { motion } from "framer-motion";

interface DashboardSummaryProps {
  total: number;
  count: number;
  topCategory: Category | null;
  onTotalClick?: () => void;
}

export function DashboardSummary({ total, count, topCategory, onTotalClick }: DashboardSummaryProps) {
  const cards = [
    {
      icon: <DollarSign className="h-6 w-6 text-primary" />,
      label: "Total Spent",
      value: `₹${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      bg: "bg-primary/10",
      onClick: onTotalClick,
      clickable: true,
    },
    {
      icon: <Hash className="h-6 w-6 text-info" />,
      label: "Entries",
      value: String(count),
      bg: "bg-info/10",
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-accent" />,
      label: "Top Category",
      value: topCategory ? `${CATEGORY_ICONS[topCategory] || "📌"} ${topCategory}` : "—",
      bg: "bg-accent/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`bg-card rounded-2xl p-4 shadow-card flex items-center gap-3 ${card.clickable ? "cursor-pointer hover:shadow-elevated transition-shadow" : ""}`}
          onClick={card.onClick}
        >
          <div className={`h-11 w-11 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
            {card.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">
              {card.label}
              {card.clickable && <span className="ml-1 text-primary">↗</span>}
            </p>
            <p className="text-lg font-bold text-foreground truncate">{card.value}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
