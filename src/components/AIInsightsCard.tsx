import { Brain, RefreshCw, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAIAnalysis } from "@/hooks/useAIAnalysis";
import { AIInsightsDashboard } from "@/components/AIInsightsDashboard";
import { motion, AnimatePresence } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";

type Expense = Tables<"expenses">;

interface AIInsightsCardProps {
  expenses: Expense[];
  notebookName?: string;
  notebookId?: string;
  currency?: string;
  period?: "all" | "week" | "month";
}

export function AIInsightsCard({ expenses, notebookName, notebookId, currency, period }: AIInsightsCardProps) {
  const { insights, isLoading, error, analyze } = useAIAnalysis(notebookId);
  const [expanded, setExpanded] = useState(false);

  const handleAnalyze = async () => {
    await analyze(expenses, notebookName, currency, period);
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">AI Insights</h3>
              <p className="text-xs text-muted-foreground">Powered by AI</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {insights && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg text-xs gap-1.5"
              onClick={handleAnalyze}
              disabled={isLoading || expenses.length === 0}
            >
              {isLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {insights ? "Refresh" : "Analyze"}
            </Button>
          </div>
        </div>

        {expenses.length === 0 && !insights && (
          <p className="text-xs text-muted-foreground">Add expenses to get AI-powered insights.</p>
        )}

        {error && (
          <div className="mt-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">{error}</div>
        )}

        {isLoading && !insights && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Analyzing your spending...
          </div>
        )}

        <AnimatePresence>
          {expanded && insights && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3">
                <AIInsightsDashboard insights={insights} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
