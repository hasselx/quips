import { formatCurrency } from "@/lib/currency";
import type { PersonSummary } from "@/hooks/useLedger";

export function buildPersonSummaryText(person: PersonSummary, currency: string): string {
  const lines: string[] = [];
  lines.push(`Ledger summary — ${person.name}`);
  lines.push("");
  const sorted = [...person.entries].sort((a, b) => a.date.localeCompare(b.date));
  for (const e of sorted) {
    const sign = e.type === "lent" ? "+" : "-";
    const label = e.type === "lent" ? "Lent" : "Borrowed";
    const date = new Date(e.date).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    lines.push(
      `${date} · ${label} ${sign}${formatCurrency(Number(e.amount), currency)}${e.note ? ` — ${e.note}` : ""}`
    );
  }
  lines.push("");
  const bal = person.balance;
  if (bal > 0) lines.push(`Balance: ${person.name} owes you ${formatCurrency(bal, currency)}`);
  else if (bal < 0) lines.push(`Balance: You owe ${person.name} ${formatCurrency(-bal, currency)}`);
  else lines.push("Balance: settled up");
  return lines.join("\n");
}

export async function sharePersonSummary(text: string, title: string): Promise<"shared" | "copied"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") throw err;
    }
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}
