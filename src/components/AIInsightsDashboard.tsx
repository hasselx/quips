import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import type { InsightsData } from "@/hooks/useAIAnalysis";

/* -------- category color map (used for dots + bar fills) -------- */
const CATEGORY_COLORS: Record<string, string> = {
  food: "#2a78d6",
  groceries: "#2a78d6",
  dining: "#2a78d6",
  rent: "#1baf7a",
  housing: "#1baf7a",
  home: "#1baf7a",
  "home setup": "#1baf7a",
  insurance: "#eda100",
  utilities: "#eda100",
  transport: "#e34948",
  transportation: "#e34948",
  travel: "#e34948",
  electronics: "#4a3aa7",
  shopping: "#4a3aa7",
  entertainment: "#4a3aa7",
  other: "#888780",
};
const FALLBACK_COLORS = ["#2a78d6", "#1baf7a", "#eda100", "#e34948", "#4a3aa7", "#888780"];
function colorFor(name: string, i = 0): string {
  return CATEGORY_COLORS[name.toLowerCase()] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
}

/* -------- badges (fixed / variable / one-time / recurring) -------- */
// fixed=red, variable=yellow, one-time=green
const FIXED_COLOR = "#e34948";
const VARIABLE_COLOR = "#eda100";
const ONETIME_COLOR = "#1baf7a";
const BADGE_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  fixed: { bg: "#FBE7E7", fg: FIXED_COLOR, label: "fixed" },
  variable: { bg: "#FAEEDA", fg: "#8a5d00", label: "variable" },
  "one-time": { bg: "#E1F5EE", fg: "#085041", label: "one-time" },
  onetime: { bg: "#E1F5EE", fg: "#085041", label: "one-time" },
  recurring: { bg: "#EEEDFE", fg: "#3C3489", label: "recurring" },
};
function Badge({ kind }: { kind: string }) {
  const s = BADGE_STYLES[kind.toLowerCase()] ?? BADGE_STYLES.variable;
  return (
    <span
      className="inline-flex items-center rounded-[4px] font-medium"
      style={{
        fontSize: 10,
        padding: "2px 7px",
        background: s.bg,
        color: s.fg,
      }}
    >
      {s.label}
    </span>
  );
}

/* -------- section header (11px uppercase 0.08em muted) -------- */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4
      className="text-muted-foreground font-medium uppercase mb-3"
      style={{ fontSize: 11, letterSpacing: "0.08em" }}
    >
      {children}
    </h4>
  );
}

/* -------- raised card wrapper -------- */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-card ${className}`}
      style={{
        border: "0.5px solid hsl(var(--border))",
        borderRadius: 12,
        padding: "1rem 1.25rem",
      }}
    >
      {children}
    </div>
  );
}

/* -------- trend helpers -------- */
function trendIcon(trend: "up" | "down" | "stable" | "new") {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5" style={{ color: "#e34948" }} />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5" style={{ color: "#1baf7a" }} />;
  if (trend === "new") return <Sparkles className="h-3.5 w-3.5" style={{ color: "#0C447C" }} />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}
function trendColor(trend: "up" | "down" | "stable" | "new") {
  if (trend === "up") return "#e34948";
  if (trend === "down") return "#1baf7a";
  if (trend === "new") return "#0C447C";
  return "hsl(var(--muted-foreground))";
}

interface Props {
  insights: InsightsData;
}

export function AIInsightsDashboard({ insights }: Props) {
  const { summary, categories, topVendors, comparison, fixedVariable, alerts, tips } = insights;

  return (
    <div className="flex flex-col" style={{ gap: "1.5rem" }}>
      {/* ============ KPI TILES ============ */}
      {summary?.metrics?.length > 0 && (
        <section>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${Math.min(summary.metrics.length, 4)}, minmax(0, 1fr))`,
            }}
          >
            {summary.metrics.map((m, i) => (
              <div
                key={i}
                className="bg-muted/40"
                style={{
                  borderRadius: "var(--radius)",
                  padding: "14px 16px",
                }}
              >
                <p
                  className="text-muted-foreground"
                  style={{ fontSize: 12, marginBottom: 4 }}
                >
                  {m.label}
                </p>
                <p
                  className="text-foreground truncate"
                  style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.15 }}
                >
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============ WHERE YOUR MONEY WENT ============ */}
      {categories?.length > 0 && (
        <section>
          <SectionHeader>where your money went</SectionHeader>
          <Card>
            <div className="flex flex-col" style={{ gap: 14 }}>
              {categories.map((c, i) => {
                const color = colorFor(c.name, i);
                const pct = Math.max(Math.min(c.percent, 100), 2);
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                      <div className="flex items-center" style={{ gap: 8 }}>
                        <span
                          aria-hidden
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: color,
                            display: "inline-block",
                          }}
                        />
                        <span
                          className="text-foreground"
                          style={{ fontSize: 13, fontWeight: 500 }}
                        >
                          {c.name}
                        </span>
                      </div>
                      <div className="flex items-center" style={{ gap: 8 }}>
                        <span
                          className="text-foreground"
                          style={{ fontSize: 13, fontWeight: 500 }}
                        >
                          {c.amount}
                        </span>
                        <span
                          className="text-muted-foreground"
                          style={{ fontSize: 11 }}
                        >
                          {Math.round(c.percent)}%
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        height: 5,
                        borderRadius: 3,
                        background: "hsl(var(--muted))",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: color,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {topVendors && topVendors.length > 0 && (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: "0.5px solid hsl(var(--border))",
                }}
              >
                <p
                  className="text-muted-foreground uppercase"
                  style={{ fontSize: 11, letterSpacing: "0.08em", marginBottom: 8 }}
                >
                  top vendors
                </p>
                <div className="flex flex-col">
                  {topVendors.map((v, i) => (
                    <div
                      key={v.name}
                      className="flex items-center justify-between"
                      style={{
                        padding: "9px 0",
                        borderBottom:
                          i === topVendors.length - 1
                            ? "none"
                            : "0.5px solid hsl(var(--border))",
                      }}
                    >
                      <div className="flex items-center" style={{ gap: 10 }}>
                        <span
                          aria-hidden
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            background: `${colorFor(v.name, i)}22`,
                            color: colorFor(v.name, i),
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {v.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <div
                            className="text-foreground"
                            style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}
                          >
                            {v.name}
                          </div>
                          <div
                            className="text-muted-foreground"
                            style={{ fontSize: 11 }}
                          >
                            {v.count}× visits
                          </div>
                        </div>
                      </div>
                      <span
                        className="text-foreground"
                        style={{ fontSize: 13, fontWeight: 500 }}
                      >
                        {v.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </section>
      )}

      {/* ============ FIXED · VARIABLE · ONE-TIME ============ */}
      {fixedVariable && (
        <section>
          <SectionHeader>fixed · variable · one-time</SectionHeader>
          <Card>
            {/* segmented bar */}
            <div
              className="flex"
              style={{
                height: 6,
                borderRadius: 3,
                overflow: "hidden",
                background: "hsl(var(--muted))",
              }}
            >
              <div style={{ width: `${fixedVariable.fixedPercent}%`, background: "#0C447C" }} />
              <div style={{ width: `${fixedVariable.variablePercent}%`, background: "#085041" }} />
              <div style={{ width: `${fixedVariable.oneTimePercent}%`, background: "#633806" }} />
            </div>
            <div
              className="flex items-center justify-between text-muted-foreground"
              style={{ fontSize: 11, marginTop: 8 }}
            >
              <span className="flex items-center" style={{ gap: 6 }}>
                <i
                  aria-hidden
                  style={{ width: 8, height: 8, borderRadius: 2, background: "#0C447C", display: "inline-block" }}
                />
                fixed {Math.round(fixedVariable.fixedPercent)}%
              </span>
              <span className="flex items-center" style={{ gap: 6 }}>
                <i
                  aria-hidden
                  style={{ width: 8, height: 8, borderRadius: 2, background: "#085041", display: "inline-block" }}
                />
                variable {Math.round(fixedVariable.variablePercent)}%
              </span>
              <span className="flex items-center" style={{ gap: 6 }}>
                <i
                  aria-hidden
                  style={{ width: 8, height: 8, borderRadius: 2, background: "#633806", display: "inline-block" }}
                />
                one-time {Math.round(fixedVariable.oneTimePercent)}%
              </span>
            </div>

            {(fixedVariable.fixedItems?.length || fixedVariable.oneTimeItems?.length) && (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: "0.5px solid hsl(var(--border))",
                }}
                className="flex flex-col"
              >
                {fixedVariable.fixedItems?.map((it, i, arr) => (
                  <div
                    key={`f-${i}`}
                    className="flex items-center justify-between"
                    style={{
                      padding: "9px 0",
                      borderBottom:
                        i === arr.length - 1 && !fixedVariable.oneTimeItems?.length
                          ? "none"
                          : "0.5px solid hsl(var(--border))",
                    }}
                  >
                    <span
                      className="text-foreground truncate"
                      style={{ fontSize: 13, fontWeight: 500 }}
                    >
                      {it.name}
                    </span>
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <span className="text-foreground" style={{ fontSize: 13, fontWeight: 500 }}>
                        {it.amount}
                      </span>
                      <Badge kind="fixed" />
                    </div>
                  </div>
                ))}
                {fixedVariable.oneTimeItems?.map((it, i, arr) => (
                  <div
                    key={`o-${i}`}
                    className="flex items-center justify-between"
                    style={{
                      padding: "9px 0",
                      borderBottom:
                        i === arr.length - 1 ? "none" : "0.5px solid hsl(var(--border))",
                    }}
                  >
                    <span
                      className="text-foreground truncate"
                      style={{ fontSize: 13, fontWeight: 500 }}
                    >
                      {it.name}
                    </span>
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <span className="text-foreground" style={{ fontSize: 13, fontWeight: 500 }}>
                        {it.amount}
                      </span>
                      <Badge kind="one-time" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      )}

      {/* ============ PERIOD COMPARISON ============ */}
      {comparison?.rows?.length > 0 && (
        <section>
          <SectionHeader>
            {comparison.previousLabel && comparison.currentLabel
              ? `${comparison.previousLabel} → ${comparison.currentLabel}`
              : "period comparison"}
          </SectionHeader>
          <Card>
            <div className="flex flex-col">
              {comparison.rows.map((r, i, arr) => (
                <div
                  key={i}
                  className="flex items-center justify-between"
                  style={{
                    padding: "9px 0",
                    borderBottom:
                      i === arr.length - 1 ? "none" : "0.5px solid hsl(var(--border))",
                    gap: 12,
                  }}
                >
                  <span
                    className="text-foreground truncate"
                    style={{ fontSize: 13, fontWeight: 500 }}
                  >
                    {r.label}
                  </span>
                  <div className="flex items-center shrink-0" style={{ gap: 6 }}>
                    {r.from && (
                      <span
                        className="text-muted-foreground"
                        style={{ fontSize: 11 }}
                      >
                        {r.from} →
                      </span>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{r.to}</span>
                    {trendIcon(r.trend)}
                    <span style={{ fontSize: 11, color: trendColor(r.trend), fontWeight: 500 }}>
                      {r.note}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {comparison.projection && (
              <p
                className="text-muted-foreground"
                style={{ fontSize: 11, marginTop: 10, lineHeight: 1.5 }}
              >
                {comparison.projection}
              </p>
            )}
          </Card>
        </section>
      )}

      {/* ============ ALERTS ============ */}
      {alerts?.length > 0 && (
        <section>
          <SectionHeader>watch out</SectionHeader>
          <Card>
            <div className="flex flex-col">
              {alerts.map((a, i, arr) => {
                const c = a.severity === "warning" ? "#eda100" : "#0C447C";
                return (
                  <div
                    key={i}
                    className="flex items-start"
                    style={{
                      gap: 10,
                      padding: "9px 0",
                      borderBottom:
                        i === arr.length - 1 ? "none" : "0.5px solid hsl(var(--border))",
                    }}
                  >
                    <AlertTriangle
                      aria-hidden
                      style={{ width: 15, height: 15, color: c, marginTop: 1, flexShrink: 0 }}
                    />
                    <div className="min-w-0">
                      <p
                        className="text-foreground"
                        style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.35 }}
                      >
                        {a.title}
                      </p>
                      <p
                        className="text-muted-foreground"
                        style={{ fontSize: 11, marginTop: 2, lineHeight: 1.4 }}
                      >
                        {a.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      )}

      {/* ============ TIPS ============ */}
      {tips?.length > 0 && (
        <section>
          <SectionHeader>{tips.length} quick wins</SectionHeader>
          <Card>
            <div className="flex flex-col">
              {tips.map((t, i, arr) => (
                <div
                  key={i}
                  className="flex items-start"
                  style={{
                    gap: 10,
                    padding: "9px 0",
                    borderBottom:
                      i === arr.length - 1 ? "none" : "0.5px solid hsl(var(--border))",
                  }}
                >
                  <Lightbulb
                    aria-hidden
                    style={{ width: 15, height: 15, color: "#1baf7a", marginTop: 1, flexShrink: 0 }}
                  />
                  <div className="min-w-0">
                    <p
                      className="text-foreground"
                      style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.35 }}
                    >
                      {t.title}
                    </p>
                    <p
                      className="text-muted-foreground"
                      style={{ fontSize: 11, marginTop: 2, lineHeight: 1.4 }}
                    >
                      {t.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
