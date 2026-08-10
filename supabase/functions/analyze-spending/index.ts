import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const insightsTool = {
  type: "function",
  function: {
    name: "render_insights",
    description: "Return a fully-structured spending insights dashboard.",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "object",
          description: "Top KPI tiles. 2-4 items.",
          properties: {
            metrics: {
              type: "array",
              minItems: 2,
              maxItems: 4,
              items: {
                type: "object",
                properties: {
                  label: { type: "string", description: "Short label e.g. 'total spent'" },
                  value: { type: "string", description: "Formatted value with currency, e.g. '€624' or '~€30/wk'" },
                },
                required: ["label", "value"],
                additionalProperties: false,
              },
            },
          },
          required: ["metrics"],
          additionalProperties: false,
        },
        categories: {
          type: "array",
          description: "Spending categories with percentages of total spend, sorted desc. Up to 6.",
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              percent: { type: "number", description: "0-100" },
              amount: { type: "string", description: "Formatted, e.g. '€260'" },
            },
            required: ["name", "percent", "amount"],
            additionalProperties: false,
          },
        },
        topVendors: {
          type: "array",
          description: "Most frequent vendors detected from names/descriptions. Up to 4.",
          maxItems: 4,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              amount: { type: "string" },
              count: { type: "integer" },
            },
            required: ["name", "amount", "count"],
            additionalProperties: false,
          },
        },
        comparison: {
          type: "object",
          description: "Period-over-period comparison.",
          properties: {
            previousLabel: { type: "string", description: "e.g. 'april'" },
            currentLabel: { type: "string", description: "e.g. 'may'" },
            rows: {
              type: "array",
              maxItems: 6,
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  from: { type: "string", description: "Previous value formatted, may be empty" },
                  to: { type: "string", description: "Current value formatted" },
                  trend: { type: "string", enum: ["up", "down", "stable", "new"] },
                  note: { type: "string", description: "Short qualifier e.g. '+22%', 'stable', 'winding down', 'first charge'" },
                },
                required: ["label", "to", "trend", "note"],
                additionalProperties: false,
              },
            },
            projection: { type: "string", description: "One-line projection for next period, e.g. 'projected june: €380–€400 (rent + groceries, no big one-offs)'. Empty if not enough data." },
          },
          required: ["rows"],
          additionalProperties: false,
        },
        fixedVariable: {
          type: "object",
          description: "Breakdown of fixed vs variable vs one-time spend.",
          properties: {
            fixedPercent: { type: "number" },
            variablePercent: { type: "number" },
            oneTimePercent: { type: "number" },
            fixedItems: {
              type: "array",
              maxItems: 6,
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  amount: { type: "string" },
                  cadence: { type: "string", description: "e.g. 'monthly', 'weekly'" },
                },
                required: ["name", "amount", "cadence"],
                additionalProperties: false,
              },
            },
            oneTimeItems: {
              type: "array",
              maxItems: 6,
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  amount: { type: "string" },
                  date: { type: "string" },
                },
                required: ["name", "amount", "date"],
                additionalProperties: false,
              },
            },
          },
          required: ["fixedPercent", "variablePercent", "oneTimePercent"],
          additionalProperties: false,
        },
        alerts: {
          type: "array",
          description: "Anomalies / things to watch. Up to 4.",
          maxItems: 4,
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              detail: { type: "string" },
              severity: { type: "string", enum: ["warning", "info"] },
            },
            required: ["title", "detail", "severity"],
            additionalProperties: false,
          },
        },
        tips: {
          type: "array",
          description: "2-3 specific quick-win actions.",
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Short imperative phrase e.g. 'one big shop per week'" },
              detail: { type: "string", description: "Why / how, includes specific numbers from the data" },
            },
            required: ["title", "detail"],
            additionalProperties: false,
          },
        },
      },
      required: ["summary", "categories", "comparison", "fixedVariable", "alerts", "tips"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { expenses, notebookName, currency, period } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!expenses || expenses.length === 0) {
      return new Response(
        JSON.stringify({ error: "Not enough data to analyze. Add some expenses first!" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currencyCode = currency || "INR";
    const periodLabel = period === "week" ? "this week" : period === "month" ? "this month" : "all time";
    const previousLabel = period === "week" ? "last week" : period === "month" ? "last month" : "the previous period";

    // Filter expenses to the viewed period so AI context matches the dashboard.
    const now = new Date();
    const startOfPeriod = (() => {
      if (period === "week") {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        return d;
      }
      if (period === "month") {
        return new Date(now.getFullYear(), now.getMonth(), 1);
      }
      return null;
    })();
    const scoped = startOfPeriod
      ? expenses.filter((e: any) => new Date(e.date) >= startOfPeriod)
      : expenses;

    // Deterministic totals (used to override AI hallucinations).
    const total = scoped.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const count = scoped.length;
    const byCategory: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    for (const e of scoped) {
      const c = e.category || "Other";
      byCategory[c] = (byCategory[c] || 0) + Number(e.amount || 0);
      const d = new Date(e.date);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        byMonth[key] = (byMonth[key] || 0) + Number(e.amount || 0);
      }
    }
    const monthKeys = Object.keys(byMonth);
    const monthCount = Math.max(monthKeys.length, 1);
    const avgPerMonth = total / monthCount;
    const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

    const fmtMoney = (n: number) => {
      try {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode, maximumFractionDigits: 2 }).format(n);
      } catch {
        return `${currencyCode} ${n.toFixed(2)}`;
      }
    };

    const groundTruth = {
      total: fmtMoney(total),
      count,
      categories: sortedCats.slice(0, 6).map(([name, amt]) => ({
        name,
        amount: fmtMoney(amt),
        percent: total > 0 ? Math.round((amt / total) * 1000) / 10 : 0,
      })),
    };

    // ---- Deterministic period-over-period comparison ----
    const inRange = (e: any, from: Date, to: Date) => {
      const d = new Date(e.date);
      return !isNaN(d.getTime()) && d >= from && d < to;
    };
    const sumBy = (list: any[]) => {
      const m: Record<string, number> = {};
      let t = 0;
      for (const e of list) {
        const c = e.category || "Other";
        const a = Number(e.amount || 0);
        m[c] = (m[c] || 0) + a;
        t += a;
      }
      return { byCat: m, total: t };
    };

    let currRange: [Date, Date];
    let prevRange: [Date, Date];
    let currName = "current";
    let prevName = "previous";
    const monthName = (d: Date) => d.toLocaleString("en-US", { month: "long" }).toLowerCase();

    if (period === "week") {
      const end = new Date(now);
      const curStart = new Date(now); curStart.setDate(curStart.getDate() - 7);
      const prevStart = new Date(now); prevStart.setDate(prevStart.getDate() - 14);
      currRange = [curStart, end];
      prevRange = [prevStart, curStart];
      currName = "this week";
      prevName = "last week";
    } else {
      // month view AND all-time both compare the latest month vs the one before.
      let ref = new Date(now.getFullYear(), now.getMonth(), 1);
      if (period !== "month") {
        const keys = monthKeys.sort();
        const last = keys[keys.length - 1];
        if (last) {
          const [y, m] = last.split("-").map(Number);
          ref = new Date(y, m - 1, 1);
        }
      }
      const nextMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
      const prevMonth = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
      currRange = [ref, nextMonth];
      prevRange = [prevMonth, ref];
      currName = monthName(ref);
      prevName = monthName(prevMonth);
    }

    const currSet = sumBy(expenses.filter((e: any) => inRange(e, currRange[0], currRange[1])));
    const prevSet = sumBy(expenses.filter((e: any) => inRange(e, prevRange[0], prevRange[1])));

    const mkRow = (label: string, from: number, to: number) => {
      let trend: "up" | "down" | "stable" | "new" = "stable";
      let note = "stable";
      if (from === 0 && to > 0) {
        trend = "new";
        note = "first charge";
      } else if (from > 0 && to === 0) {
        trend = "down";
        note = "-100%";
      } else if (from > 0) {
        const pct = ((to - from) / from) * 100;
        const r = Math.round(pct * 10) / 10;
        if (Math.abs(r) < 5) { trend = "stable"; note = "stable"; }
        else { trend = r > 0 ? "up" : "down"; note = `${r > 0 ? "+" : ""}${r}%`; }
      }
      return { label, from: from > 0 ? fmtMoney(from) : "", to: fmtMoney(to), trend, note };
    };

    const catNames = Array.from(new Set([...Object.keys(currSet.byCat), ...Object.keys(prevSet.byCat)]))
      .sort((a, b) => (currSet.byCat[b] || 0) - (currSet.byCat[a] || 0))
      .slice(0, 5);

    const comparisonRows = [
      mkRow("Total spent", prevSet.total, currSet.total),
      ...catNames.map((c) => mkRow(c, prevSet.byCat[c] || 0, currSet.byCat[c] || 0)),
    ];


    const systemPrompt = `You are a financial analyst AI for an expense tracker called "Quips".
You receive expenses already scoped to **${periodLabel}** (currency: ${currencyCode}).

Your job: produce a structured insights dashboard by calling the render_insights tool. Use the optional "description" field on each expense to identify vendors, recurring patterns, and duplicates.

CRITICAL — GROUND TRUTH (do NOT recompute, use these exact numbers):
- Total spent: ${groundTruth.total}
- Transaction count: ${groundTruth.count}
- Category breakdown (name, amount, percent of total):
${groundTruth.categories.map(c => `  • ${c.name}: ${c.amount} (${c.percent}%)`).join("\n")}

Rules:
- summary.metrics MUST include "total spent" = ${groundTruth.total} and "transactions" = ${groundTruth.count}. Fill the other 1-2 tiles with derived metrics (e.g. avg per day, top category amount).
- categories array MUST reproduce the ground-truth list above verbatim (same names, amounts, percents, same order).
- All other monetary values MUST use the ${currencyCode} symbol/format.
- Percentages are numbers 0-100 (no % sign).
- For fixed costs: identify expenses that repeat at similar amounts on a regular cadence (rent, subscriptions, EMIs).
- For one-time payments: large or notable expenses appearing only once (gadgets, travel, gifts).
- Comparison: compare ${periodLabel} vs ${previousLabel}. Use trend "new" if a charge appeared this period for the first time, "stable" if change is <5%, "up" if increased, "down" if decreased. Include "+22%" style notes.
- If period is "all time", comparison rows should compare the most recent month vs the previous month.
- Alerts: flag unexpected spikes, frequent small trips (impulse buying), possible duplicates.
- Tips: 2-3 actionable wins with specific numbers from the data.
- Be concise. Every label/detail under 90 chars.`;

    const expenseSummary = JSON.stringify(
      scoped.map((e: any) => ({
        name: e.name,
        amount: e.amount,
        category: e.category,
        date: e.date,
        description: e.description || undefined,
      }))
    );

    const userPrompt = `Expenses${notebookName ? ` from "${notebookName}"` : ""}. Today: ${new Date().toISOString().split("T")[0]}. Viewing **${periodLabel}**.\n\n${expenseSummary}\n\nCall render_insights now.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [insightsTool],
        tool_choice: { type: "function", function: { name: "render_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "AI did not return structured insights" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let insights;
    try {
      insights = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool arguments:", toolCall.function.arguments);
      return new Response(JSON.stringify({ error: "Malformed AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enforce deterministic ground truth so the dashboard matches the app's totals.
    const truthMetrics = [
      { label: "total spent", value: groundTruth.total },
      { label: "avg / month", value: fmtMoney(avgPerMonth) },
      { label: "transactions", value: String(groundTruth.count) },
    ];
    const aiExtras = (insights.summary?.metrics || []).filter(
      (m: any) => !["total spent", "transactions", "total", "entries", "count", "avg / month", "avg/month", "monthly average", "average per month"].includes((m.label || "").toLowerCase())
    );
    insights.summary = { metrics: [...truthMetrics, ...aiExtras].slice(0, 4) };
    insights.categories = groundTruth.categories;
    insights.comparison = {
      previousLabel: prevName,
      currentLabel: currName,
      rows: comparisonRows,
      projection: insights.comparison?.projection || "",
    };


    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-spending error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
