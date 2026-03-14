import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { expenses, notebookName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!expenses || expenses.length === 0) {
      return new Response(
        JSON.stringify({ analysis: "Not enough data to analyze. Add some expenses first!" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a smart financial analyst AI for a personal expense tracker app called "Quips". 
Analyze the user's spending data and provide actionable insights. Be concise, friendly, and use emojis sparingly.

Structure your response with these sections using markdown headers:

## 📊 Spending Patterns
- Identify top spending categories and their percentages
- Note high-spending days or weeks
- Detect recurring payments

## ⚠️ Anomalies & Alerts
- Flag transactions significantly larger than average
- Identify unexpected spending spikes
- Compare current period vs historical averages

## 🔮 Predictions
- Estimate end-of-month total if mid-month
- Forecast potential budget overruns
- Project next month's spending based on trends

## 💡 Recommendations
- Suggest categories where spending could be reduced
- Identify potential duplicate or unnecessary expenses
- Give 2-3 specific, actionable tips

Keep the total response under 500 words. Use bullet points. Include specific numbers and percentages when possible. Currency is INR (₹).`;

    const expenseSummary = JSON.stringify(
      expenses.map((e: any) => ({
        name: e.name,
        amount: e.amount,
        category: e.category,
        date: e.date,
      }))
    );

    const userPrompt = `Here are the expenses${notebookName ? ` from notebook "${notebookName}"` : ""} to analyze:\n\n${expenseSummary}\n\nToday's date is ${new Date().toISOString().split("T")[0]}. Please provide a comprehensive spending analysis.`;

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
