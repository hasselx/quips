import { useState } from "react";
import { Brain, RefreshCw, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAIAnalysis } from "@/hooks/useAIAnalysis";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";

type Expense = Tables<"expenses">;

interface AIInsightsCardProps {
  expenses: Expense[];
  notebookName?: string;
}

export function AIInsightsCard({ expenses, notebookName }: AIInsightsCardProps) {
  const { analysis, isLoading, error, analyze } = useAIAnalysis();
  const [expanded, setExpanded] = useState(false);

  const handleAnalyze = () => {
    setExpanded(true);
    analyze(expenses, notebookName);
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
            {analysis && (
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
              {isLoading ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {analysis ? "Refresh" : "Analyze"}
            </Button>
          </div>
        </div>

        {expenses.length === 0 && !analysis && (
          <p className="text-xs text-muted-foreground">Add expenses to get AI-powered insights.</p>
        )}

        {error && (
          <div className="mt-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
            {error}
          </div>
        )}

        <AnimatePresence>
          {expanded && analysis && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 prose prose-sm dark:prose-invert max-w-none text-sm [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_ul]:my-1 [&_li]:my-0.5">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
              {isLoading && (
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Analyzing...
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
