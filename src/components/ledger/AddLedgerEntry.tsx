import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownLeft, ArrowUpRight, Plus, Trash2, User, Users, Wallet } from "lucide-react";
import { getCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { EntryType, NewEntry } from "@/hooks/useLedger";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currency: string;
  knownPeople: string[];
  onSubmit: (rows: NewEntry[]) => Promise<void>;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function AddLedgerEntry({ open, onOpenChange, currency, knownPeople, onSubmit }: Props) {
  const symbol = getCurrency(currency).symbol;
  const [mode, setMode] = useState<"single" | "split">("single");
  const [type, setType] = useState<EntryType>("lent");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // single
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  // split
  const [total, setTotal] = useState("");
  const [splitMode, setSplitMode] = useState<"even" | "custom">("even");
  const [includeMe, setIncludeMe] = useState(true);
  const [members, setMembers] = useState<{ name: string; amount: string }[]>([
    { name: "", amount: "" },
    { name: "", amount: "" },
  ]);

  const evenShare = useMemo(() => {
    const t = Number(total) || 0;
    const named = members.filter((m) => m.name.trim()).length;
    const divisor = named + (includeMe ? 1 : 0);
    return divisor > 0 ? t / divisor : 0;
  }, [total, members, includeMe]);

  const reset = () => {
    setMode("single");
    setType("lent");
    setDate(todayISO());
    setNote("");
    setName("");
    setAmount("");
    setTotal("");
    setSplitMode("even");
    setIncludeMe(true);
    setMembers([
      { name: "", amount: "" },
      { name: "", amount: "" },
    ]);
  };

  const close = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSubmit = async () => {
    let rows: NewEntry[] = [];

    if (mode === "single") {
      const amt = Number(amount);
      if (!name.trim()) return toast.error("Enter a name");
      if (!amt || amt <= 0) return toast.error("Enter a valid amount");
      rows = [{ person_name: name.trim(), amount: amt, type, date, note: note.trim() }];
    } else {
      const named = members.filter((m) => m.name.trim());
      if (named.length === 0) return toast.error("Add at least one person");
      if (splitMode === "even") {
        const t = Number(total);
        if (!t || t <= 0) return toast.error("Enter a valid total amount");
        rows = named.map((m) => ({
          person_name: m.name.trim(),
          amount: Math.round(evenShare * 100) / 100,
          type,
          date,
          note: note.trim(),
        }));
      } else {
        rows = named.map((m) => ({
          person_name: m.name.trim(),
          amount: Number(m.amount) || 0,
          type,
          date,
          note: note.trim(),
        }));
        if (rows.some((r) => r.amount <= 0)) return toast.error("Enter an amount for each person");
      }
    }

    setSaving(true);
    try {
      await onSubmit(rows);
      toast.success(rows.length > 1 ? `${rows.length} entries added` : "Entry added");
      close(false);
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const TypeToggle = (
    <div className="grid grid-cols-3 gap-2">
      {(["lent", "borrowed", "income"] as EntryType[]).map((t) => {
        const active = type === t;
        const Icon = t === "lent" ? ArrowDownLeft : t === "income" ? Wallet : ArrowUpRight;
        const label =
          t === "income"
            ? "Income"
            : mode === "split"
              ? t === "lent"
                ? "I paid"
                : "They paid"
              : t === "lent"
                ? "I lent"
                : "I borrowed";
        return (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border py-3 text-xs sm:text-sm font-medium transition-colors",
              active
                ? t === "lent"
                  ? "border-primary bg-primary/10 text-primary"
                  : t === "income"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-destructive bg-destructive/10 text-destructive"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">Add entry</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "single" | "split")}>
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="single" className="rounded-lg gap-1.5">
              <User className="h-3.5 w-3.5" /> Single
            </TabsTrigger>
            <TabsTrigger value="split" className="rounded-lg gap-1.5">
              <Users className="h-3.5 w-3.5" /> Split
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4 pt-1">
          {TypeToggle}

          {mode === "single" ? (
            <>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  list="ledger-people"
                  placeholder="e.g. Alex"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl"
                />
                <datalist id="ledger-people">
                  {knownPeople.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{symbol}</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="rounded-xl pl-8"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Total amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{symbol}</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0.00"
                    value={total}
                    onChange={(e) => setTotal(e.target.value)}
                    className="rounded-xl pl-8"
                    disabled={splitMode === "custom"}
                  />
                </div>
              </div>

              <Tabs value={splitMode} onValueChange={(v) => setSplitMode(v as "even" | "custom")}>
                <TabsList className="grid w-full grid-cols-2 rounded-xl">
                  <TabsTrigger value="even" className="rounded-lg text-xs sm:text-sm">Split evenly</TabsTrigger>
                  <TabsTrigger value="custom" className="rounded-lg text-xs sm:text-sm">Custom amounts</TabsTrigger>
                </TabsList>
              </Tabs>

              {splitMode === "even" && (
                <>
                  <label className="flex items-start gap-2.5 text-sm text-foreground">
                    <Checkbox checked={includeMe} onCheckedChange={(v) => setIncludeMe(!!v)} className="mt-0.5" />
                    <span>Include my share (split among me + the people below)</span>
                  </label>
                  {evenShare > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Each person: {symbol}
                      {evenShare.toFixed(2)}
                    </p>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label>People</Label>
                {members.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      list="ledger-people"
                      placeholder={`Person ${i + 1}`}
                      value={m.name}
                      onChange={(e) =>
                        setMembers((prev) => prev.map((p, idx) => (idx === i ? { ...p, name: e.target.value } : p)))
                      }
                      className="rounded-xl flex-1"
                    />
                    {splitMode === "custom" && (
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">{symbol}</span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          placeholder="0.00"
                          value={m.amount}
                          onChange={(e) =>
                            setMembers((prev) => prev.map((p, idx) => (idx === i ? { ...p, amount: e.target.value } : p)))
                          }
                          className="rounded-xl pl-6"
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setMembers((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive p-1.5"
                      aria-label="Remove person"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5"
                  onClick={() => setMembers((prev) => [...prev, { name: "", amount: "" }])}
                >
                  <Plus className="h-3.5 w-3.5" /> Add person
                </Button>
              </div>
              <datalist id="ledger-people">
                {knownPeople.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Textarea
              placeholder="What was it for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-xl resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-2 pt-1">
            <Button className="w-full rounded-xl" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : mode === "split" ? "Add split" : "Add entry"}
            </Button>
            <Button variant="ghost" className="w-full rounded-xl" onClick={() => close(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
