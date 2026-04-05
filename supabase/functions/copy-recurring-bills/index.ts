import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { notebook_id } = await req.json();

    // Get notebook to verify it's recurring type
    const { data: notebook, error: nbErr } = await supabase
      .from("notebooks")
      .select("*")
      .eq("id", notebook_id)
      .single();

    if (nbErr || !notebook) {
      return new Response(JSON.stringify({ error: "Notebook not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (notebook.type !== "Recurring Bills") {
      return new Response(JSON.stringify({ error: "Not a recurring bills notebook" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current month and previous month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Check if current month already has expenses (already copied)
    const startOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
    const endOfMonth = currentMonth === 11
      ? `${currentYear + 1}-01-01`
      : `${currentYear}-${String(currentMonth + 2).padStart(2, "0")}-01`;

    const { data: existingExpenses } = await supabase
      .from("expenses")
      .select("id")
      .eq("notebook_id", notebook_id)
      .gte("date", startOfMonth)
      .lt("date", endOfMonth)
      .limit(1);

    if (existingExpenses && existingExpenses.length > 0) {
      return new Response(JSON.stringify({ message: "Current month already has expenses", copied: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get previous month's expenses
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevStart = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`;
    const prevEnd = prevMonth === 11
      ? `${prevYear + 1}-01-01`
      : `${prevYear}-${String(prevMonth + 2).padStart(2, "0")}-01`;

    const { data: prevExpenses, error: expErr } = await supabase
      .from("expenses")
      .select("*")
      .eq("notebook_id", notebook_id)
      .gte("date", prevStart)
      .lt("date", prevEnd);

    if (expErr || !prevExpenses || prevExpenses.length === 0) {
      return new Response(JSON.stringify({ message: "No previous month expenses to copy", copied: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Copy expenses to current month with updated dates
    const newExpenses = prevExpenses.map((e) => {
      const oldDate = new Date(e.date);
      const newDay = Math.min(oldDate.getDate(), new Date(currentYear, currentMonth + 1, 0).getDate());
      const newDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`;

      return {
        notebook_id: e.notebook_id,
        user_id: e.user_id,
        name: e.name,
        category: e.category,
        amount: e.amount,
        date: newDate,
      };
    });

    const { error: insertErr } = await supabase.from("expenses").insert(newExpenses);

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update notebook's updated_at
    await supabase.from("notebooks").update({ updated_at: new Date().toISOString() }).eq("id", notebook_id);

    return new Response(JSON.stringify({ message: "Recurring bills copied", copied: newExpenses.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
