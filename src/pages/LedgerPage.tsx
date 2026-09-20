import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownLeft, ArrowUpRight, Plus, Share2 } from "lucide-react";
import { toast } from "sonner";
import { CURRENCIES, formatCurrency, getCurrency } from "@/lib/currency";
import { buildPersonSummaryText, sharePersonSummary } from "@/lib/ledgerShare";
import { useLedger, useUserCurrency, type PersonSummary } from "@/hooks/useLedger";
import { AddLedgerEntry } from "@/components/ledger/AddLedgerEntry";
import { PersonDetail } from "@/components/ledger/PersonDetail";
import { cn } from "@/lib/utils";

export default function LedgerPage() {
  const { people, owedToMe, iOwe, net, isLoading, addEntries, deleteEntry, clearPerson } = useLedger();
  const { currency, setCurrency } = useUserCurrency();
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const selectedPerson = useMemo(
    () => people.find((p) => p.name === selected) ?? null,
    [people, selected]
  );

  const handleShare = async (person: PersonSummary) => {
    const text = buildPersonSummaryText(person, currency);
    try {
      const res = await sharePersonSummary(text, `Ledger — ${person.name}`);
      if (res === "copied") toast.success("Summary copied to clipboard");
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Ledger</h1>
          <p className="text-muted-foreground text-sm">Track what you've lent and borrowed.</p>
        </div>
        <Select value={currency} onValueChange={(v) => setCurrency.mutate(v)}>
          <SelectTrigger className="w-[120px] rounded-xl">
            <SelectValue>
              {getCurrency(currency).symbol} {currency}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-popover z-50 max-h-72">
            {CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.symbol} {c.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-card rounded-2xl p-4 shadow-card">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowDownLeft className="h-4 w-4 text-primary" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Owed to you</span>
          </div>
          <p className="text-2xl font-bold text-primary">{formatCurrency(owedToMe, currency)}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-card">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowUpRight className="h-4 w-4 text-destructive" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">You owe</span>
          </div>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(iOwe, currency)}</p>
        </div>
      </div>

      <div className="bg-muted/60 rounded-2xl px-4 py-3 mb-5 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Net balance</span>
        <span className={cn("text-lg font-bold", net >= 0 ? "text-primary" : "text-destructive")}>
          {net >= 0 ? "+" : "-"}
          {formatCurrency(Math.abs(net), currency)}
        </span>
      </div>

      <Button className="w-full rounded-xl gap-2 mb-6 h-12" onClick={() => setAddOpen(true)}>
        <Plus className="h-4 w-4" /> Add entry
      </Button>

      <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">People</h2>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : people.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 shadow-card text-center">
          <p className="text-muted-foreground text-sm">No entries yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          {people.map((p) => (
            <div key={p.name} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
              <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => setSelected(p.name)}>
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.entries.length} {p.entries.length === 1 ? "entry" : "entries"}
                  </p>
                </div>
                <div className="ml-auto text-right pr-1">
                  <p className={cn("text-sm font-bold", p.balance > 0 ? "text-primary" : p.balance < 0 ? "text-destructive" : "text-muted-foreground")}>
                    {p.balance > 0 ? "+" : p.balance < 0 ? "-" : ""}
                    {formatCurrency(Math.abs(p.balance), currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.balance > 0 ? "owes you" : p.balance < 0 ? "you owe" : "settled"}
                  </p>
                </div>
              </button>
              <button
                onClick={() => handleShare(p)}
                className="text-muted-foreground hover:text-foreground p-1.5"
                aria-label={`Share summary for ${p.name}`}
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AddLedgerEntry
        open={addOpen}
        onOpenChange={setAddOpen}
        currency={currency}
        knownPeople={people.map((p) => p.name)}
        onSubmit={(rows) => addEntries.mutateAsync(rows)}
      />

      <PersonDetail
        person={selectedPerson}
        currency={currency}
        onOpenChange={(v) => !v && setSelected(null)}
        onShare={handleShare}
        onDeleteEntry={(id) => deleteEntry.mutate(id)}
        onClearPerson={(name) => clearPerson.mutate(name)}
      />
    </div>
  );
}
