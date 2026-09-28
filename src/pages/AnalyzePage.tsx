import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLedger, useUserCurrency } from "@/hooks/useLedger";
import { CURRENCIES, formatCurrency, getCurrency } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, BookUser, Lightbulb } from "lucide-react";

type Period = "all" | "month" | "3m" | "year";
const COLORS = ["hsl(25,80%,55%)", "hsl(210,70%,55%)", "hsl(340,65%,55%)", "hsl(45,85%,50%)", "hsl(270,55%,55%)", "hsl(160,55%,42%)", "hsl(190,60%,50%)", "hsl(0,65%,55%)"];

const periodStart = (p: Period) => {
  const d = new Date();
  if (p === "month") return new Date(d.getFullYear(), d.getMonth(), 1);
  if (p === "3m") return new Date(d.getFullYear(), d.getMonth() - 2, 1);
  if (p === "year") return new Date(d.getFullYear(), 0, 1);
  return null;
};
const monthKey = (date: string) => date.slice(0, 7);
const monthLabel = (k: string) => new Date(k + "-01").toLocaleDateString(undefined, { month: "short", year: "2-digit" });

export default function AnalyzePage() {
  const { user } = useAuth();
  const { currency: userCurrency } = useUserCurrency();
  const [currency, setCurrency] = useState<string | null>(null);
  const cur = currency ?? userCurrency ?? "EUR";
  const [period, setPeriod] = useState<Period>("all");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [includeLedger, setIncludeLedger] = useState(true);
  const { entries: ledgerEntries = [] } = useLedger() as any;

  const { data: notebooks = [] } = useQuery({
    queryKey: ["analyze-notebooks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("notebooks").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["analyze-expenses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: income = [] } = useQuery({
    queryKey: ["analyze-income", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("income_entries").select("*");
      if (error) throw error;
      return data;
    },
  });

  const visibleNotebooks = notebooks.filter((n) => (n.currency || "INR") === cur);
  const selectedIds = new Set(visibleNotebooks.filter((n) => !excluded.has(n.id)).map((n) => n.id));
  const toggle = (id: string) =>
    setExcluded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const r = useMemo(() => {
    const start = periodStart(period);
    const inPeriod = (d: string) => !start || new Date(d) >= start;
    const exp = expenses.filter((e) => selectedIds.has(e.notebook_id) && inPeriod(e.date));
    const inc = income.filter((e) => selectedIds.has(e.notebook_id) && inPeriod(e.date));
    const led = includeLedger && cur === userCurrency ? (ledgerEntries as any[]).filter((e) => inPeriod(e.date) && (e.type === "lent" || e.type === "borrowed")) : [];

    const totalExp = exp.reduce((s, e) => s + Number(e.amount), 0);
    const totalInc = inc.reduce((s, e) => s + Number(e.amount), 0);
    const lent = led.filter((e) => e.type === "lent").reduce((s, e) => s + Number(e.amount), 0);
    const borrowed = led.filter((e) => e.type === "borrowed").reduce((s, e) => s + Number(e.amount), 0);

    const months: Record<string, { month: string; Income: number; Expense: number; Lent: number; Borrowed: number }> = {};
    const m = (k: string) => (months[k] ??= { month: k, Income: 0, Expense: 0, Lent: 0, Borrowed: 0 });
    exp.forEach((e) => (m(monthKey(e.date)).Expense += Number(e.amount)));
    inc.forEach((e) => (m(monthKey(e.date)).Income += Number(e.amount)));
    led.forEach((e) => (m(monthKey(e.date))[e.type === "lent" ? "Lent" : "Borrowed"] += Number(e.amount)));
    const monthly = Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).map((x) => ({ ...x, label: monthLabel(x.month) }));

    const cat = (rows: { category: string; amount: number }[]) => {
      const map: Record<string, number> = {};
      rows.forEach((e) => (map[e.category] = (map[e.category] || 0) + Number(e.amount)));
      return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value);
    };
    const expCats = cat(exp as any);
    const incCats = cat(inc as any);

    const net = totalInc - totalExp;
    const savingsRate = totalInc > 0 ? (net / totalInc) * 100 : null;
    const points: { tone: "good" | "bad" | "info"; text: string }[] = [];
    if (totalInc === 0 && totalExp === 0 && led.length === 0) points.push({ tone: "info", text: "No data for this selection yet." });
    else {
      if (savingsRate !== null)
        points.push(savingsRate >= 20
          ? { tone: "good", text: `You saved ${savingsRate.toFixed(0)}% of your income (${formatCurrency(net, cur)}).` }
          : savingsRate >= 0
          ? { tone: "info", text: `You saved ${savingsRate.toFixed(0)}% of your income — aim for 20% or more.` }
          : { tone: "bad", text: `You spent ${formatCurrency(-net, cur)} more than you earned.` });
      else if (totalExp > 0) points.push({ tone: "info", text: "No income recorded for this selection — add an Income notebook to compare." });
      if (expCats[0] && totalExp > 0)
        points.push({ tone: "info", text: `Biggest spending category: ${expCats[0].name} (${((expCats[0].value / totalExp) * 100).toFixed(0)}% of expenses).` });
      if (incCats[0] && totalInc > 0 && incCats.length > 0)
        points.push({ tone: "info", text: `Main income source: ${incCats[0].name} (${((incCats[0].value / totalInc) * 100).toFixed(0)}%).` });
      if (monthly.length >= 2) {
        const [a, b] = monthly.slice(-2);
        if (a.Expense > 0) {
          const ch = ((b.Expense - a.Expense) / a.Expense) * 100;
          points.push({ tone: ch > 10 ? "bad" : ch < -10 ? "good" : "info", text: `Spending in ${b.label} is ${Math.abs(ch).toFixed(0)}% ${ch >= 0 ? "higher" : "lower"} than ${a.label}.` });
        }
        const avg = monthly.reduce((s, x) => s + x.Expense, 0) / monthly.length;
        points.push({ tone: "info", text: `Average monthly spending: ${formatCurrency(avg, cur)}.` });

        // Per-category trend: compare each category's last two months
        const prevByCat: Record<string, number> = {};
        const curByCat: Record<string, number> = {};
        exp.forEach((e) => {
          const k = monthKey(e.date);
          if (k === a.month) prevByCat[e.category] = (prevByCat[e.category] || 0) + Number(e.amount);
          else if (k === b.month) curByCat[e.category] = (curByCat[e.category] || 0) + Number(e.amount);
        });
        const catNames = [...new Set([...Object.keys(prevByCat), ...Object.keys(curByCat)])];
        const catTrends = catNames
          .map((name) => {
            const prev = prevByCat[name] || 0;
            const curv = curByCat[name] || 0;
            const ch = prev > 0 ? ((curv - prev) / prev) * 100 : curv > 0 ? Infinity : 0;
            return { name, prev, curv, ch };
          })
          .sort((x, y) => Math.abs(y.curv - y.prev) - Math.abs(x.curv - x.prev));
        catTrends.slice(0, 5).forEach((t) => {
          if (t.prev === 0 && t.curv > 0)
            points.push({ tone: "info", text: `${t.name}: new spending of ${formatCurrency(t.curv, cur)} in ${b.label} (none in ${a.label}).` });
          else if (t.prev > 0 && t.curv === 0)
            points.push({ tone: "good", text: `${t.name}: no spending in ${b.label} (was ${formatCurrency(t.prev, cur)} in ${a.label}).` });
          else if (t.prev > 0)
            points.push({
              tone: t.ch > 15 ? "bad" : t.ch < -15 ? "good" : "info",
              text: `${t.name}: ${formatCurrency(t.prev, cur)} → ${formatCurrency(t.curv, cur)} (${t.ch >= 0 ? "+" : ""}${t.ch.toFixed(0)}% vs ${a.label}).`,
            });
        });
      }
      if (led.length) {
        const bal = lent - borrowed;
        points.push({ tone: bal >= 0 ? "info" : "bad", text: bal >= 0 ? `Ledger: others owe you ${formatCurrency(bal, cur)} from this period.` : `Ledger: you owe others ${formatCurrency(-bal, cur)} from this period.` });
        if (totalInc > 0 && lent > totalInc * 0.25) points.push({ tone: "bad", text: `You lent out ${((lent / totalInc) * 100).toFixed(0)}% of your income.` });
      }
    }
    return { totalExp, totalInc, net, lent, borrowed, monthly, expCats, points, hasLedger: led.length > 0 };
  }, [expenses, income, ledgerEntries, period, includeLedger, cur, userCurrency, notebooks, excluded]);

  const fmt = (v: number) => formatCurrency(v, cur);
  const tile = (label: string, value: string, cls: string) => (
    <div className="bg-card rounded-2xl p-3 shadow-card">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className={cn("text-lg font-bold truncate", cls)}>{value}</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Analyze</h1>
          <p className="text-muted-foreground text-sm">Compare expenses, income and ledger together.</p>
        </div>
        <Select value={cur} onValueChange={(v) => { setCurrency(v); }}>
          <SelectTrigger className="w-[110px] rounded-xl"><SelectValue>{getCurrency(cur).symbol} {cur}</SelectValue></SelectTrigger>
          <SelectContent className="bg-popover z-50 max-h-72">
            {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-card space-y-3">
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {([["all", "All time"], ["year", "This year"], ["3m", "3 months"], ["month", "This month"]] as [Period, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setPeriod(k)} className={cn("flex-1 text-xs font-medium py-1.5 rounded-lg", period === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>{l}</button>
          ))}
        </div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Include</p>
        {visibleNotebooks.length === 0 && <p className="text-xs text-muted-foreground">No notebooks in {cur}.</p>}
        <div className="grid sm:grid-cols-2 gap-2">
          {visibleNotebooks.map((n) => (
            <label key={n.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={!excluded.has(n.id)} onCheckedChange={() => toggle(n.id)} />
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", n.type === "Income" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>{n.type === "Income" ? "Income" : "Expense"}</span>
              <span className="truncate">{n.name}</span>
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={includeLedger} onCheckedChange={(v) => setIncludeLedger(!!v)} disabled={cur !== userCurrency} />
            <BookUser className="h-4 w-4 text-muted-foreground" />
            <span>Ledger {cur !== userCurrency && <span className="text-xs text-muted-foreground">(only in {userCurrency})</span>}</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tile("Income", fmt(r.totalInc), "text-primary")}
        {tile("Expenses", fmt(r.totalExp), "text-destructive")}
        {tile("Net", (r.net >= 0 ? "+" : "-") + fmt(Math.abs(r.net)), r.net >= 0 ? "text-primary" : "text-destructive")}
        {tile("Ledger net", (r.lent - r.borrowed >= 0 ? "+" : "-") + fmt(Math.abs(r.lent - r.borrowed)), "text-foreground")}
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-card">
        <h2 className="text-sm font-bold mb-2 flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-primary" /> Noted points</h2>
        <ul className="space-y-1.5">
          {r.points.map((p, i) => (
            <li key={i} className="flex gap-2 text-sm">
              {p.tone === "good" ? <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" /> : p.tone === "bad" ? <TrendingDown className="h-4 w-4 text-destructive shrink-0 mt-0.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0 mt-2 mx-1" />}
              <span className="text-foreground">{p.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {r.monthly.length > 0 && (
        <div className="bg-card rounded-2xl p-4 shadow-card">
          <h2 className="text-sm font-bold mb-3">Monthly overview</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={50} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                {r.hasLedger && <Bar dataKey="Lent" fill="hsl(210,70%,55%)" radius={[4, 4, 0, 0]} />}
                {r.hasLedger && <Bar dataKey="Borrowed" fill="hsl(45,85%,50%)" radius={[4, 4, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {(r.totalInc > 0 || r.totalExp > 0) && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 shadow-card">
            <h2 className="text-sm font-bold mb-2">Income vs expenses</h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ name: "Income", value: r.totalInc }, { name: "Expenses", value: r.totalExp }]} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    <Cell fill="hsl(var(--primary))" /><Cell fill="hsl(var(--destructive))" />
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-card">
            <h2 className="text-sm font-bold mb-2">Top spending categories</h2>
            {r.expCats.length === 0 ? <p className="text-xs text-muted-foreground">No expenses.</p> : (
              <div className="space-y-2">
                {r.expCats.slice(0, 6).map((c, i) => (
                  <div key={c.name}>
                    <div className="flex justify-between text-xs"><span>{c.name}</span><span className="font-semibold">{fmt(c.value)}</span></div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(c.value / r.totalExp) * 100}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
