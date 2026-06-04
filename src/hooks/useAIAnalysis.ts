import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Expense = Tables<"expenses">;

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-spending`;

export const GLOBAL_ANALYSIS_ID = "all-notebooks-global";

export interface InsightsData {
  summary: { metrics: { label: string; value: string }[] };
  categories: { name: string; percent: number; amount: string }[];
  topVendors?: { name: string; amount: string; count: number }[];
  comparison: {
    previousLabel?: string;
    currentLabel?: string;
    rows: { label: string; from?: string; to: string; trend: "up" | "down" | "stable" | "new"; note: string }[];
    projection?: string;
  };
  fixedVariable: {
    fixedPercent: number;
    variablePercent: number;
    oneTimePercent: number;
    fixedItems?: { name: string; amount: string; cadence: string }[];
    oneTimeItems?: { name: string; amount: string; date: string }[];
  };
  alerts: { title: string; detail: string; severity: "warning" | "info" }[];
  tips: { title: string; detail: string }[];
}

export function useAIAnalysis(notebookId?: string) {
  const { user } = useAuth();
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedLoaded, setCachedLoaded] = useState(false);

  useEffect(() => {
    if (!notebookId || !user) return;
    supabase
      .from("ai_analyses")
      .select("content")
      .eq("notebook_id", notebookId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.content) {
          try {
            const parsed = JSON.parse(data.content);
            if (parsed && typeof parsed === "object" && parsed.summary) {
              setInsights(parsed as InsightsData);
            }
          } catch {
            // Old markdown cache — ignore
          }
        }
        setCachedLoaded(true);
      });
  }, [notebookId, user]);

  const saveAnalysis = useCallback(async (content: string) => {
    if (!notebookId || !user) return;
    await supabase.from("ai_analyses").delete().eq("notebook_id", notebookId).eq("user_id", user.id);
    await supabase.from("ai_analyses").insert({ notebook_id: notebookId, user_id: user.id, content });
  }, [notebookId, user]);

  const clearAnalysis = useCallback(async () => {
    if (!notebookId || !user) return;
    await supabase.from("ai_analyses").delete().eq("notebook_id", notebookId).eq("user_id", user.id);
    setInsights(null);
  }, [notebookId, user]);

  const analyze = useCallback(async (expenses: Expense[], notebookName?: string, currency?: string, period?: "all" | "week" | "month") => {
    setIsLoading(true);
    setError(null);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ expenses, notebookName, currency, period }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || `Analysis failed (${resp.status})`);
      if (!data.insights) throw new Error("No insights returned");

      setInsights(data.insights as InsightsData);
      await saveAnalysis(JSON.stringify(data.insights));
    } catch (e: any) {
      setError(e.message || "Analysis failed");
    } finally {
      setIsLoading(false);
    }
  }, [saveAnalysis]);

  return { insights, isLoading, error, analyze, clearAnalysis, cachedLoaded };
}
