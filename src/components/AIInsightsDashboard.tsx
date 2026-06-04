import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  ArrowLeftRight,
  Layers,
  Store,
} from "lucide-react";
import type { InsightsData } from "@/hooks/useAIAnalysis";

const BAR_COLORS = [
  "bg-emerald-600",
  "bg-blue-600",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-slate-500",
];

function trendIcon(trend: "up" | "down" | "stable" | "new") {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-rose-500" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />;
  if (trend === "new") return <Sparkles className="h-3.5 w-3.5 text-blue-500" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function trendColor(trend: "up" | "down" | "stable" | "new") {
  if (trend === "up") return "text-rose-500";
  if (trend === "down") return "text-emerald-500";
  if (trend === "new") return "text-blue-500";
  return "text-muted-foreground";
}

interface Props {
  insights: InsightsData;
}

export function AIInsightsDashboard({ insights }: Props) {
  const { summary, categories, topVendors, comparison, fixedVariable, alerts, tips } = insights;

  return (
    <div className="space-y-4">
      {/* Summary metric tiles */}
      {summary?.metrics?.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {summary.metrics.map((m, i) => (
            <div key={i} className="rounded-xl bg-card border border-border p-3">
              <p className="text-lg font-bold text-foreground leading-tight truncate">{m.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Categories bar chart */}
      {categories?.length > 0 && (
        <section className="rounded-xl bg-card border border-border p-3">
          <SectionHeader icon={<BarChart3 className="h-3.5 w-3.5" />} title="where your money went" />
          <div className="space-y-2 mt-2">
            {categories.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs text-muted-foreground truncate">{c.name}</span>
                <div className="flex-1 h-6 rounded-md bg-muted/40 overflow-hidden relative">
                  <div
                    className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]} flex items-center justify-end pr-2 transition-all`}
                    style={{ width: `${Math.max(Math.min(c.percent, 100), 4)}%` }}
                  >
                    <span className="text-[10px] font-bold text-white">{Math.round(c.percent)}%</span>
                  </div>
                </div>
                <span className="w-14 shrink-0 text-right text-[11px] font-semibold text-foreground">{c.amount}</span>
              </div>
            ))}
          </div>
          {topVendors && topVendors.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {topVendors.map((v) => (
                <span key={v.name} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-[10px] font-medium text-foreground">
                  <Store className="h-3 w-3" />
                  {v.name} {v.amount} · {v.count}x
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Fixed vs Variable vs One-Time */}
      {fixedVariable && (
        <section className="rounded-xl bg-card border border-border p-3">
          <SectionHeader icon={<Layers className="h-3.5 w-3.5" />} title="fixed · variable · one-time" />
          <div className="flex h-2 rounded-full overflow-hidden mt-2 bg-muted/40">
            <div className="bg-emerald-600" style={{ width: `${fixedVariable.fixedPercent}%` }} />
            <div className="bg-blue-600" style={{ width: `${fixedVariable.variablePercent}%` }} />
            <div className="bg-amber-500" style={{ width: `${fixedVariable.oneTimePercent}%` }} />
          </div>
          <div className="flex justify-between text-[10px] mt-1.5 text-muted-foreground">
            <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-600 mr-1" />fixed {Math.round(fixedVariable.fixedPercent)}%</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-1" />variable {Math.round(fixedVariable.variablePercent)}%</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />one-time {Math.round(fixedVariable.oneTimePercent)}%</span>
          </div>
          {(fixedVariable.fixedItems?.length || fixedVariable.oneTimeItems?.length) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {fixedVariable.fixedItems?.length ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Fixed</p>
                  <ul className="space-y-1">
                    {fixedVariable.fixedItems.map((it, i) => (
                      <li key={i} className="flex justify-between text-xs">
                        <span className="truncate text-foreground">{it.name}</span>
                        <span className="text-muted-foreground shrink-0 ml-2">{it.amount} · {it.cadence}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {fixedVariable.oneTimeItems?.length ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">One-time</p>
                  <ul className="space-y-1">
                    {fixedVariable.oneTimeItems.map((it, i) => (
                      <li key={i} className="flex justify-between text-xs">
                        <span className="truncate text-foreground">{it.name}</span>
                        <span className="text-muted-foreground shrink-0 ml-2">{it.amount}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </section>
      )}

      {/* Comparison */}
      {comparison?.rows?.length > 0 && (
        <section className="rounded-xl bg-card border border-border p-3">
          <SectionHeader
            icon={<ArrowLeftRight className="h-3.5 w-3.5" />}
            title={comparison.previousLabel && comparison.currentLabel
              ? `${comparison.previousLabel} → ${comparison.currentLabel}`
              : "period comparison"}
          />
          <div className="divide-y divide-border mt-1">
            {comparison.rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 gap-2">
                <span className="text-xs text-muted-foreground truncate">{r.label}</span>
                <div className={`flex items-center gap-1.5 text-xs font-medium ${trendColor(r.trend)} shrink-0`}>
                  {r.from && <span className="text-muted-foreground">{r.from} →</span>}
                  <span>{r.to}</span>
                  {trendIcon(r.trend)}
                  <span className="text-[11px]">{r.note}</span>
                </div>
              </div>
            ))}
          </div>
          {comparison.projection && (
            <div className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-foreground">
              {comparison.projection}
            </div>
          )}
        </section>
      )}

      {/* Alerts */}
      {alerts?.length > 0 && (
        <section>
          <SectionHeader icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />} title="watch out" />
          <div className="space-y-2 mt-2">
            {alerts.map((a, i) => (
              <div key={i} className={`rounded-xl border p-3 ${a.severity === "warning" ? "border-amber-500/30 bg-amber-500/5" : "border-blue-500/30 bg-blue-500/5"}`}>
                <p className="text-xs font-bold text-foreground">{a.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{a.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tips */}
      {tips?.length > 0 && (
        <section>
          <SectionHeader icon={<Lightbulb className="h-3.5 w-3.5 text-emerald-500" />} title={`${tips.length} quick wins`} />
          <div className="space-y-2 mt-2">
            {tips.map((t, i) => (
              <div key={i} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="text-xs font-bold text-foreground">{t.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <h4 className="text-xs font-bold text-foreground lowercase tracking-wide">{title}</h4>
    </div>
  );
}
