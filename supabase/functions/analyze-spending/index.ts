import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { expenses, notebookName, currency, period } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!expenses || expenses.length === 0) {
      return new Response(
        JSON.stringify({ analysis: "Not enough data to analyze. Add some expenses first!" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currencyCode = currency || "INR";
    const periodLabel = period === "week" ? "this week" : period === "month" ? "this month" : "all time";
    const previousLabel = period === "week" ? "last week" : period === "month" ? "last month" : "the previous period";

    const systemPrompt = `You are a smart financial analyst AI for a personal expense tracker app called "Quips".
Analyze the user's spending data and provide actionable insights. Be concise, friendly, and use emojis sparingly.
Pay close attention to the optional "description" field on each expense — it contains user-provided context (notes, vendor info, purpose) that often clarifies what the expense was for. Use it to identify patterns, group related spending, and give more accurate, personalized insights.

The user is currently viewing: **${periodLabel}**. You receive the FULL expense history so you can compare ${periodLabel} vs ${previousLabel}.

Structure your response with these sections using markdown headers:

## 📊 Spending Patterns (${periodLabel})
- Top categories with amounts and % of total
- Recurring vendors (use descriptions)

## 🔁 Fixed vs Variable Costs
- **Fixed costs**: expenses that repeat at similar amounts on a regular cadence (rent, subscriptions, EMIs, utilities, insurance). List each with the recurring amount.
- **Variable costs**: discretionary / fluctuating spend (food, shopping, entertainment, travel). Give the total and % of overall spend.
- Show the fixed : variable ratio.

## 📈 Change vs ${previousLabel}
- Compare total spend ${periodLabel} vs ${previousLabel} — give absolute change and %.
- Call out categories that grew or shrank the most (with numbers).
- Flag any NEW recurring charges that appeared, or recurring charges that stopped.

## ⚠️ Anomalies & Alerts
- Transactions significantly larger than the user's average
- Unexpected spikes or duplicates (descriptions can reveal duplicates)

## 💡 Recommendations
- 2-3 specific, actionable tips focused on the biggest opportunities

Keep the total response under 550 words. Use bullet points. Always include specific numbers. The currency is ${currencyCode}.`;

    const expenseSummary = JSON.stringify(
      expenses.map((e: any) => ({
        name: e.name,
        amount: e.amount,
        category: e.category,
        date: e.date,
        description: e.description || undefined,
      }))
    );

    const userPrompt = `Here is the FULL expense history${notebookName ? ` from notebook "${notebookName}"` : ""} (currency: ${currencyCode}). The user is viewing **${periodLabel}**.\n\n${expenseSummary}\n\nToday's date is ${new Date().toISOString().split("T")[0]}. Provide the analysis as specified, including the fixed vs variable breakdown and the comparison vs ${previousLabel}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("analyze-spending error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
