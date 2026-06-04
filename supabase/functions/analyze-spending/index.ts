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

    const systemPrompt = `You are a financial analyst AI for an expense tracker called "Quips".
You receive the FULL expense history (currency: ${currencyCode}). The user is currently viewing **${periodLabel}**.

Your job: produce a structured insights dashboard by calling the render_insights tool. Use the optional "description" field on each expense to identify vendors, recurring patterns, and duplicates.

Rules:
- All monetary values MUST be formatted with the proper symbol for ${currencyCode} (e.g. €624, ₹1,200, $50).
- Percentages are numbers 0-100 (no % sign).
- Sort categories descending by spend.
- For fixed costs: identify expenses that repeat at similar amounts on a regular cadence (rent, subscriptions, EMIs).
- For one-time payments: large or notable expenses appearing only once (gadgets, travel, gifts).
- Comparison: compare ${periodLabel} vs ${previousLabel}. Use trend "new" if a charge appeared this period for the first time, "stable" if change is <5%, "up" if increased, "down" if decreased. Include "+22%" style notes.
- If period is "all time", comparison rows should compare the most recent month vs the previous month.
- Alerts: flag unexpected spikes, frequent small trips (impulse buying), possible duplicates.
- Tips: 2-3 actionable wins with specific numbers from the data.
- Be concise. Every label/detail under 90 chars.`;

    const expenseSummary = JSON.stringify(
      expenses.map((e: any) => ({
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
