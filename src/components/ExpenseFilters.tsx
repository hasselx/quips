import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

export interface FilterState {
  timeRange: string;
  customFrom: string;
  customTo: string;
  minAmount: string;
  maxAmount: string;
  category: string;
  search: string;
}

const INITIAL: FilterState = {
  timeRange: "all",
  customFrom: "",
  customTo: "",
  minAmount: "",
  maxAmount: "",
  category: "all",
  search: "",
};

interface ExpenseFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  categories: string[];
}

export function ExpenseFilters({ filters, onChange, categories }: ExpenseFiltersProps) {
  const [open, setOpen] = useState(false);
  const hasFilters = filters.timeRange !== "all" || filters.category !== "all" || filters.minAmount || filters.maxAmount || filters.search;

  const update = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search expenses..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="rounded-xl flex-1"
        />
        <Button
          variant={hasFilters ? "default" : "outline"}
          size="icon"
          className="rounded-xl shrink-0"
          onClick={() => setOpen(!open)}
        >
          <Filter className="h-4 w-4" />
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="icon" className="rounded-xl shrink-0" onClick={() => onChange(INITIAL)}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-2xl shadow-card p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Time Range</label>
                  <Select value={filters.timeRange} onValueChange={(v) => update({ timeRange: v })}>
                    <SelectTrigger className="rounded-xl text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                  <Select value={filters.category} onValueChange={(v) => update({ category: v })}>
                    <SelectTrigger className="rounded-xl text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="all">All</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filters.timeRange === "custom" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">From</label>
                    <Input type="date" value={filters.customFrom} onChange={(e) => update({ customFrom: e.target.value })} className="rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">To</label>
                    <Input type="date" value={filters.customTo} onChange={(e) => update({ customTo: e.target.value })} className="rounded-xl text-sm" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Amount</label>
                  <Input type="number" placeholder="₹0" value={filters.minAmount} onChange={(e) => update({ minAmount: e.target.value })} className="rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Amount</label>
                  <Input type="number" placeholder="₹∞" value={filters.maxAmount} onChange={(e) => update({ maxAmount: e.target.value })} className="rounded-xl text-sm" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function applyFilters(expenses: any[], filters: FilterState) {
  let result = [...expenses];

  // Search
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((e) => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
  }

  // Category
  if (filters.category !== "all") {
    result = result.filter((e) => e.category === filters.category);
  }

  // Time range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (filters.timeRange === "today") {
    result = result.filter((e) => new Date(e.date) >= today);
  } else if (filters.timeRange === "week") {
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - weekAgo.getDay());
    result = result.filter((e) => new Date(e.date) >= weekAgo);
  } else if (filters.timeRange === "month") {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    result = result.filter((e) => new Date(e.date) >= monthStart);
  } else if (filters.timeRange === "custom") {
    if (filters.customFrom) result = result.filter((e) => e.date >= filters.customFrom);
    if (filters.customTo) result = result.filter((e) => e.date <= filters.customTo);
  }

  // Amount range
  if (filters.minAmount) result = result.filter((e) => Number(e.amount) >= Number(filters.minAmount));
  if (filters.maxAmount) result = result.filter((e) => Number(e.amount) <= Number(filters.maxAmount));

  return result;
}

export const DEFAULT_FILTERS: FilterState = INITIAL;
