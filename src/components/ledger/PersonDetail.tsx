import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ArrowDownLeft, ArrowUpRight, Share2, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { PersonSummary } from "@/hooks/useLedger";

interface Props {
  person: PersonSummary | null;
  currency: string;
  onOpenChange: (v: boolean) => void;
  onShare: (person: PersonSummary) => void;
  onDeleteEntry: (id: string) => void;
  onClearPerson: (name: string) => void;
}

export function PersonDetail({ person, currency, onOpenChange, onShare, onDeleteEntry, onClearPerson }: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  if (!person) return null;

  const bal = person.balance;
  const balLabel = bal > 0 ? "owes you" : bal < 0 ? "you owe" : "settled up";

  return (
    <>
      <Dialog open={!!person} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col rounded-2xl p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3 flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-lg">{person.name}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="mr-6 h-8 w-8"
              onClick={() => onShare(person)}
              aria-label="Share summary"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="mx-5 mb-3 rounded-xl bg-muted/60 py-4 text-center">
            <p className="text-sm text-muted-foreground">{balLabel}</p>
            <p className={cn("text-2xl font-bold", bal > 0 ? "text-primary" : bal < 0 ? "text-destructive" : "text-foreground")}>
              {bal > 0 ? "+" : bal < 0 ? "-" : ""}
              {formatCurrency(Math.abs(bal), currency)}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto border-t border-border">
            {person.entries.map((e) => {
              const lent = e.type === "lent";
              return (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3 border-b border-border">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                      lent ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                    )}
                  >
                    {lent ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{lent ? "Lent" : "Borrowed"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {new Date(e.date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                      {e.note ? ` · ${e.note}` : ""}
                    </p>
                  </div>
                  <span className={cn("text-sm font-semibold", lent ? "text-primary" : "text-destructive")}>
                    {lent ? "+" : "-"}
                    {formatCurrency(Number(e.amount), currency)}
                  </span>
                  <button
                    onClick={() => onDeleteEntry(e.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    aria-label="Delete entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="p-4">
            <Button
              variant="outline"
              className="w-full rounded-xl gap-2 text-destructive hover:text-destructive"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 className="h-4 w-4" />
              Clear all history with {person.name}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all history with {person.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes every entry with {person.name}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onClearPerson(person.name);
                setConfirmClear(false);
                onOpenChange(false);
              }}
            >
              Delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
