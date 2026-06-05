import { DollarSign, Hash, TrendingUp } from "lucide-react";
import { getCategoryIcon } from "@/types/expense";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/currency";

interface DashboardSummaryProps {
  total: number;
  count: number;
  topCategory: string | null;
  onTotalClick?: () => void;
  customCategories?: string[];
  currency?: string;
}

export function DashboardSummary({ total, count, topCategory, onTotalClick, customCategories = [], currency }: DashboardSummaryProps) {
  const cards = [
    {
      icon: <DollarSign className="h-6 w-6 text-primary" />,
      label: "Total Spent",
      value: formatCurrency(total, currency),
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
      value: topCategory ? `${getCategoryIcon(topCategory, customCategories)} ${topCategory}` : "—",
      bg: "bg-accent/10",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`bg-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-card flex items-center gap-2 sm:gap-3 ${card.clickable ? "cursor-pointer hover:shadow-elevated transition-shadow" : ""}`}
          onClick={card.onClick}
        >
          <div className={`hidden sm:flex h-11 w-11 rounded-xl ${card.bg} items-center justify-center shrink-0`}>
            {card.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">
              {card.label}
              {card.clickable && <span className="ml-1 text-primary">↗</span>}
            </p>
            <p className="text-sm sm:text-lg font-bold text-foreground truncate">{card.value}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
