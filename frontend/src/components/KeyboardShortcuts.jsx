import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { STATUSES } from "@/lib/status";

export const SHORTCUTS = [
  ["/", "Search games"],
  ["[  ]", "Previous / next tab"],
  ["g  t  l", "Cards, table or list layout"],
  ["n  p", "Next / previous page"],
  [`1–${STATUSES.length}`, `Set status of the focused game (${STATUSES.join(", ")})`],
  ["d", "Open details for the focused game"],
  ["Esc", "Close a panel or clear the search"],
  ["?", "Show this list"],
];

export function KeyboardShortcuts({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="space-y-4 p-5 sm:p-6">
          <div className="pr-8">
            <DialogTitle className="font-display text-xl font-light">Keyboard shortcuts</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Focus a card or row with Tab (or by clicking it) to use the per-game keys.
            </DialogDescription>
          </div>
          <dl className="divide-y divide-border text-sm">
            {SHORTCUTS.map(([keys, label]) => (
              <div key={keys} className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="flex shrink-0 gap-1">
                  {keys.split(/\s+/).map((key) => (
                    <kbd key={key} className="min-w-6 rounded-md border border-border-strong bg-abyss px-1.5 py-0.5 text-center font-sans text-xs">{key}</kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}
