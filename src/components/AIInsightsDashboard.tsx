import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  Flame,
  PiggyBank,
} from "lucide-react";
import type { InsightsData } from "@/hooks/useAIAnalysis";

/* ---------------- category color map ---------------- */
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

/* fixed=red, variable=yellow, one-time=green */
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
      className="inline-flex items-center rounded font-medium"
      style={{ fontSize: 10, padding: "2px 7px", background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

/* ---------------- expandable section ---------------- */
function useRemembered(key: string, initial: boolean) {
  const storageKey = `ai-insights.expanded.${key}`;
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return initial;
    const raw = window.localStorage.getItem(storageKey);
    return raw === null ? initial : raw === "1";
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, open ? "1" : "0");
    } catch {}
  }, [open, storageKey]);
  return [open, setOpen] as const;
}

function Section({
  title,
  storageKey,
  defaultOpen = true,
  collapsible = true,
  right,
  children,
}: {
  title: string;
  storageKey?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useRemembered(storageKey ?? title, defaultOpen);
  const isOpen = collapsible ? open : true;
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => collapsible && setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-muted-foreground font-medium uppercase"
          style={{ fontSize: 11, letterSpacing: "0.08em" }}
          aria-expanded={isOpen}
          disabled={!collapsible}
        >
          {title}
          {collapsible && (
            <ChevronDown
              className="transition-transform"
              style={{
                width: 12,
                height: 12,
                transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
              }}
              aria-hidden
            />
          )}
        </button>
        {right}
      </div>
      {isOpen && children}
    </section>
  );
}

/* ---------------- raised card ---------------- */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-card ${className}`}
      style={{
        border: "0.5px solid hsl(var(--border))",
        borderRadius: 12,
        padding: 12,
      }}
    >
      {children}
    </div>
  );
}

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

/* ---------------- money parsing helper ---------------- */
function parseAmt(s?: string): number {
  if (!s) return 0;
  // strip currency symbols and non numeric except . and ,
  const cleaned = s.replace(/[^0-9.,-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(/,/g, ".");
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : 0;
}

interface Props {
  insights: InsightsData;
}

export function AIInsightsDashboard({ insights }: Props) {
  const { summary, categories, topVendors, comparison, fixedVariable, alerts, tips } = insights;

  /* ---------------- Key Insights (derived) ---------------- */
  const keyInsights = useMemo(() => {
    const items: {
      kind: "biggest" | "attention" | "saving";
      title: string;
      value?: string;
      detail: string;
      color: string;
      Icon: any;
    }[] = [];

    const topCat = categories?.[0];
    if (topCat) {
      items.push({
        kind: "biggest",
        title: "Biggest expense",
        value: topCat.amount,
        detail: `${topCat.name} · ${Math.round(topCat.percent)}% of total`,
        color: "#e34948",
        Icon: Flame,
      });
    }

    const worstAlert = alerts?.find((a) => a.severity === "warning") ?? alerts?.[0];
    if (worstAlert) {
      items.push({
        kind: "attention",
        title: worstAlert.title,
        detail: worstAlert.detail,
        color: "#eda100",
        Icon: AlertTriangle,
      });
    }

    const topTip = tips?.[0];
    if (topTip) {
      items.push({
        kind: "saving",
        title: topTip.title,
        detail: topTip.detail,
        color: "#1baf7a",
        Icon: PiggyBank,
      });
    }
    return items.slice(0, 3);
  }, [categories, alerts, tips]);

  /* ---------------- Spending breakdown split ---------------- */
  const [showAllCats, setShowAllCats] = useState(false);
  const top3Cats = categories?.slice(0, 3) ?? [];
  const restCats = categories?.slice(3) ?? [];

  /* ---------------- Fixed/one-time reveal ---------------- */
  const [showAllFV, setShowAllFV] = useState(false);
  const fixedItemsShown = showAllFV
    ? fixedVariable?.fixedItems ?? []
    : (fixedVariable?.fixedItems ?? []).slice(0, 3);
  const oneTimeItemsShown = showAllFV
    ? fixedVariable?.oneTimeItems ?? []
    : (fixedVariable?.oneTimeItems ?? []).slice(0, 2);
  const fvHasMore =
    (fixedVariable?.fixedItems?.length ?? 0) > 3 ||
    (fixedVariable?.oneTimeItems?.length ?? 0) > 2;

  return (
    <div className="flex flex-col" style={{ gap: 24 }}>
      {/* ============ 1. SUMMARY ============ */}
      {summary?.metrics?.length > 0 && (
        <Section title="ai summary" storageKey="summary" collapsible={false}>
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            }}
          >
            {summary.metrics.map((m, i) => (
              <div
                key={i}
                className="bg-muted/40"
                style={{ borderRadius: "var(--radius)", padding: 12 }}
              >
                <p className="text-muted-foreground" style={{ fontSize: 12, marginBottom: 4 }}>
                  {m.label}
                </p>
                <p
                  className="text-foreground break-words"
                  style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.15 }}
                >
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ============ 2. KEY INSIGHTS ============ */}
      {keyInsights.length > 0 && (
        <Section title="key insights" storageKey="key">
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
          >
            {keyInsights.map((k, i) => (
              <div
                key={i}
                className="bg-card"
                style={{
                  border: "0.5px solid hsl(var(--border))",
                  borderRadius: 12,
                  padding: 12,
                  borderLeft: `3px solid ${k.color}`,
                }}
              >
                <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                  <k.Icon aria-hidden style={{ width: 14, height: 14, color: k.color }} />
                  <span
                    className="text-muted-foreground uppercase"
                    style={{ fontSize: 10, letterSpacing: "0.08em", fontWeight: 500 }}
                  >
                    {k.kind === "biggest"
                      ? "biggest"
                      : k.kind === "attention"
                      ? "attention"
                      : "saving op"}
                  </span>
                </div>
                {k.value && (
                  <p
                    className="text-foreground"
                    style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.2, marginBottom: 2 }}
                  >
                    {k.value}
                  </p>
                )}
                <p
                  className="text-foreground"
                  style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}
                >
                  {k.title}
                </p>
                <p
                  className="text-muted-foreground line-clamp-3"
                  style={{ fontSize: 11, marginTop: 4, lineHeight: 1.4 }}
                >
                  {k.detail}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ============ 3. SPENDING BREAKDOWN ============ */}
      {categories?.length > 0 && (
        <Section title="spending breakdown" storageKey="breakdown">
          <Card>
            <div className="flex flex-col" style={{ gap: 14 }}>
              {top3Cats.map((c, i) => {
                const color = colorFor(c.name, i);
                const pct = Math.max(Math.min(c.percent, 100), 2);
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 6 }}>
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
                        <span className="text-foreground" style={{ fontSize: 13, fontWeight: 500 }}>
                          {c.name}
                        </span>
                      </div>
                      <div className="flex items-center" style={{ gap: 8 }}>
                        <span className="text-foreground" style={{ fontSize: 13, fontWeight: 500 }}>
                          {c.amount}
                        </span>
                        <span className="text-muted-foreground" style={{ fontSize: 11 }}>
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
                      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {restCats.length > 0 && (
              <>
                {showAllCats && (
                  <div
                    className="flex flex-col"
                    style={{
                      marginTop: 12,
                      paddingTop: 8,
                      borderTop: "0.5px solid hsl(var(--border))",
                    }}
                  >
                    {restCats.map((c, i) => (
                      <div
                        key={c.name}
                        className="flex items-center justify-between flex-wrap gap-2"
                        style={{
                          padding: "9px 0",
                          borderBottom:
                            i === restCats.length - 1 ? "none" : "0.5px solid hsl(var(--border))",
                        }}
                      >
                        <div className="flex items-center" style={{ gap: 8 }}>
                          <span
                            aria-hidden
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              background: colorFor(c.name, i + 3),
                            }}
                          />
                          <span className="text-foreground" style={{ fontSize: 13, fontWeight: 500 }}>
                            {c.name}
                          </span>
                        </div>
                        <div className="flex items-center" style={{ gap: 8 }}>
                          <span className="text-foreground" style={{ fontSize: 13, fontWeight: 500 }}>
                            {c.amount}
                          </span>
                          <span className="text-muted-foreground" style={{ fontSize: 11 }}>
                            {Math.round(c.percent)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowAllCats((v) => !v)}
                  className="text-primary hover:underline"
                  style={{ fontSize: 11, fontWeight: 500, marginTop: 10 }}
                >
                  {showAllCats ? "show less" : `show all categories (${restCats.length} more)`}
                </button>
              </>
            )}
          </Card>
        </Section>
      )}

      {/* ============ 4. MONTHLY COMPARISON ============ */}
      {comparison?.rows?.length > 0 && (
        <Section
          title={
            comparison.previousLabel && comparison.currentLabel
              ? `${comparison.previousLabel} → ${comparison.currentLabel}`
              : "monthly comparison"
          }
          storageKey="comparison"
        >
          <Card>
            {/* header row */}
            <div
              className="grid text-muted-foreground uppercase"
              style={{
                gridTemplateColumns: "1.4fr 1fr 1fr auto",
                gap: 8,
                fontSize: 10,
                letterSpacing: "0.08em",
                paddingBottom: 8,
                borderBottom: "0.5px solid hsl(var(--border))",
              }}
            >
              <span>category</span>
              <span className="text-right">prev</span>
              <span className="text-right">curr</span>
              <span className="text-right">chg</span>
            </div>
            {comparison.rows.map((r, i, arr) => (
              <div
                key={i}
                className="grid items-center"
                style={{
                  gridTemplateColumns: "1.4fr 1fr 1fr auto",
                  gap: 8,
                  padding: "9px 0",
                  borderBottom: i === arr.length - 1 ? "none" : "0.5px solid hsl(var(--border))",
                }}
              >
                <span
                  className="text-foreground truncate"
                  style={{ fontSize: 13, fontWeight: 500 }}
                >
                  {r.label}
                </span>
                <span
                  className="text-muted-foreground text-right"
                  style={{ fontSize: 12 }}
                >
                  {r.from || "—"}
                </span>
                <span
                  className="text-foreground text-right"
                  style={{ fontSize: 13, fontWeight: 500 }}
                >
                  {r.to}
                </span>
                <span
                  className="flex items-center justify-end"
                  style={{ gap: 4, fontSize: 11, color: trendColor(r.trend), fontWeight: 500 }}
                >
                  {trendIcon(r.trend)}
                  {r.note}
                </span>
              </div>
            ))}
            {comparison.projection && (
              <p
                className="text-muted-foreground"
                style={{ fontSize: 11, marginTop: 10, lineHeight: 1.5 }}
              >
                {comparison.projection}
              </p>
            )}
          </Card>
        </Section>
      )}

      {/* ============ 5. FIXED · VARIABLE · ONE-TIME ============ */}
      {fixedVariable && (
        <Section title="fixed · variable · one-time" storageKey="fv">
          <Card>
            <div
              className="flex"
              style={{
                height: 8,
                borderRadius: 4,
                overflow: "hidden",
                background: "hsl(var(--muted))",
              }}
            >
              <div style={{ width: `${fixedVariable.fixedPercent}%`, background: FIXED_COLOR }} />
              <div style={{ width: `${fixedVariable.variablePercent}%`, background: VARIABLE_COLOR }} />
              <div style={{ width: `${fixedVariable.oneTimePercent}%`, background: ONETIME_COLOR }} />
            </div>
            <div
              className="flex items-center justify-between text-muted-foreground flex-wrap gap-2"
              style={{ fontSize: 11, marginTop: 8 }}
            >
              <span className="flex items-center" style={{ gap: 6 }}>
                <i aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: FIXED_COLOR }} />
                fixed {Math.round(fixedVariable.fixedPercent)}%
              </span>
              <span className="flex items-center" style={{ gap: 6 }}>
                <i aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: VARIABLE_COLOR }} />
                variable {Math.round(fixedVariable.variablePercent)}%
              </span>
              <span className="flex items-center" style={{ gap: 6 }}>
                <i aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: ONETIME_COLOR }} />
                one-time {Math.round(fixedVariable.oneTimePercent)}%
              </span>
            </div>

            {(fixedItemsShown.length > 0 || oneTimeItemsShown.length > 0) && (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: "0.5px solid hsl(var(--border))",
                }}
                className="flex flex-col"
              >
                {fixedItemsShown.map((it, i, arr) => (
                  <div
                    key={`f-${i}`}
                    className="flex items-center justify-between flex-wrap gap-2"
                    style={{
                      padding: "9px 0",
                      borderBottom:
                        i === arr.length - 1 && oneTimeItemsShown.length === 0
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
                {oneTimeItemsShown.map((it, i, arr) => (
                  <div
                    key={`o-${i}`}
                    className="flex items-center justify-between flex-wrap gap-2"
                    style={{
                      padding: "9px 0",
                      borderBottom: i === arr.length - 1 ? "none" : "0.5px solid hsl(var(--border))",
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

            {fvHasMore && (
              <button
                type="button"
                onClick={() => setShowAllFV((v) => !v)}
                className="text-primary hover:underline"
                style={{ fontSize: 11, fontWeight: 500, marginTop: 10 }}
              >
                {showAllFV ? "see less" : "see all"}
              </button>
            )}
          </Card>
        </Section>
      )}

      {/* ============ 6. TOP VENDORS ============ */}
      {topVendors && topVendors.length > 0 && (
        <Section title="top vendors" storageKey="vendors">
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
          >
            {topVendors.map((v, i) => {
              const c = colorFor(v.name, i);
              return (
                <div
                  key={v.name}
                  className="bg-card flex items-center gap-3"
                  style={{
                    border: "0.5px solid hsl(var(--border))",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: `${c}22`,
                      color: c,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    {v.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-foreground truncate"
                      style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}
                    >
                      {v.name}
                    </p>
                    <p className="text-muted-foreground" style={{ fontSize: 11 }}>
                      {v.count}× · {v.amount}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ============ 7. WATCH OUT ============ */}
      {alerts?.length > 0 && (
        <Section title="watch out" storageKey="alerts">
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
          >
            {alerts.map((a, i) => {
              const c = a.severity === "warning" ? "#eda100" : "#0C447C";
              return (
                <div
                  key={i}
                  className="bg-card"
                  style={{
                    border: "0.5px solid hsl(var(--border))",
                    borderLeft: `3px solid ${c}`,
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      aria-hidden
                      style={{ width: 15, height: 15, color: c, marginTop: 1, flexShrink: 0 }}
                    />
                    <div className="min-w-0">
                      <p
                        className="text-foreground"
                        style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}
                      >
                        {a.title}
                      </p>
                      <p
                        className="text-muted-foreground line-clamp-3"
                        style={{ fontSize: 11, marginTop: 4, lineHeight: 1.4 }}
                      >
                        {a.detail}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ============ 8. QUICK WINS ============ */}
      {tips?.length > 0 && (
        <Section title="quick wins" storageKey="tips">
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
          >
            {tips.map((t, i) => (
              <div
                key={i}
                className="bg-card"
                style={{
                  border: "0.5px solid hsl(var(--border))",
                  borderLeft: "3px solid #1baf7a",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div className="flex items-start gap-2">
                  <Lightbulb
                    aria-hidden
                    style={{ width: 15, height: 15, color: "#1baf7a", marginTop: 1, flexShrink: 0 }}
                  />
                  <div className="min-w-0">
                    <p
                      className="text-foreground"
                      style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}
                    >
                      {t.title}
                    </p>
                    <p
                      className="text-muted-foreground line-clamp-3"
                      style={{ fontSize: 11, marginTop: 4, lineHeight: 1.4 }}
                    >
                      {t.detail}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
