import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Expense = Tables<"expenses">;

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-spending`;

export const GLOBAL_ANALYSIS_ID = "all-notebooks-global";

export function useAIAnalysis(notebookId?: string) {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedLoaded, setCachedLoaded] = useState(false);

  // Load cached analysis on mount
  useEffect(() => {
    if (!notebookId || !user) return;
    supabase
      .from("ai_analyses")
      .select("content")
      .eq("notebook_id", notebookId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.content) {
          setAnalysis(data.content);
        }
        setCachedLoaded(true);
      });
  }, [notebookId, user]);

  const saveAnalysis = useCallback(async (content: string) => {
    if (!notebookId || !user) return;
    // Try upsert: delete old then insert
    const { error: delError } = await supabase
      .from("ai_analyses")
      .delete()
      .eq("notebook_id", notebookId)
      .eq("user_id", user.id);
    console.log("ai_analyses delete result:", { delError });
    
    const { error: insError } = await supabase.from("ai_analyses").insert({
      notebook_id: notebookId,
      user_id: user.id,
      content,
    });
    console.log("ai_analyses insert result:", { insError });
  }, [notebookId, user]);

  const clearAnalysis = useCallback(async () => {
    if (!notebookId || !user) return;
    await supabase.from("ai_analyses").delete().eq("notebook_id", notebookId).eq("user_id", user.id);
    setAnalysis("");
  }, [notebookId]);

  const analyze = useCallback(async (expenses: Expense[], notebookName?: string, currency?: string, period?: "all" | "week" | "month") => {
    setIsLoading(true);
    setAnalysis("");
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

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `Analysis failed (${resp.status})`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAnalysis(fullText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAnalysis(fullText);
            }
          } catch { /* ignore */ }
        }
      }

      // Save completed analysis
      if (fullText) {
        await saveAnalysis(fullText);
      }
    } catch (e: any) {
      setError(e.message || "Analysis failed");
    } finally {
      setIsLoading(false);
    }
  }, [saveAnalysis]);

  return { analysis, isLoading, error, analyze, clearAnalysis, cachedLoaded };
}
