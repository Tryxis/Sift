import { useRef, useState } from "react";
import { Download, Keyboard, MoreHorizontal, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportCsv, exportJson, planImport, readImportFile } from "@/lib/exportImport";

function describePatch(patch) {
  return Object.entries(patch)
    .map(([key, value]) => {
      if (key === "clearFinishedHours") return "clear finished hours";
      if (key === "notes") return value ? "notes" : "clear notes";
      if (key === "priority") return value ? `queue #${value}` : "remove from queue";
      if (key === "playedBefore") return `played before: ${value ? "yes" : "no"}`;
      if (key === "notesPrivate") return value ? "notes private" : "notes public";
      if (key === "finishedHours") return `finished ${value} h`;
      return `${value}`;
    })
    .join(", ");
}

function ImportDialog({ plan, onCancel, onConfirm }) {
  const [isApplying, setIsApplying] = useState(false);
  return (
    <Dialog open={Boolean(plan)} onOpenChange={(open) => !open && !isApplying && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        {plan && (
          <div className="flex min-h-0 flex-col gap-4 p-5 sm:p-6">
            <div className="pr-8">
              <DialogTitle className="font-display text-xl font-light">Import changes</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                {plan.changes.length
                  ? `${plan.changes.length} of ${plan.total} rows change a game in this library.`
                  : `Nothing to change: all ${plan.total} rows already match.`}
                {plan.unmatched > 0 && ` ${plan.unmatched} rows didn't match a game you own.`}
                {plan.invalid > 0 && ` ${plan.invalid} values were invalid and skipped.`}
              </DialogDescription>
            </div>
            {plan.changes.length > 0 && (
              <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-well border border-border px-3 text-sm">
                {plan.changes.map((change) => (
                  <li key={change.appId} className="flex justify-between gap-3 py-1.5">
                    <span className="truncate">{change.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{describePatch(change.patch)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onCancel} disabled={isApplying}>Cancel</Button>
              {plan.changes.length > 0 && (
                <Button
                  size="sm"
                  disabled={isApplying}
                  onClick={async () => {
                    setIsApplying(true);
                    await onConfirm(plan.changes);
                    setIsApplying(false);
                  }}
                >
                  {isApplying ? "Applying…" : `Apply ${plan.changes.length} changes`}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Export/import and the shortcuts sheet, tucked behind a "…" button on the profile header.
 * Without `onApplyImport` (someone else's library) there's no import.
 */
export function DataMenu({ library, onApplyImport, onShowShortcuts }) {
  const fileRef = useRef(null);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      setPlan(planImport(await readImportFile(file), library.games));
    } catch (e) {
      setError(`Couldn't read ${file.name}: ${e.message}`);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Library data and shortcuts">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => exportJson(library)}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export backup (JSON)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => exportCsv(library)}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export spreadsheet (CSV)
          </DropdownMenuItem>
          {onApplyImport && (
            <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Import JSON or CSV…
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onShowShortcuts}>
            <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
            Keyboard shortcuts
            <kbd className="ml-auto text-xs text-muted-foreground">?</kbd>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input ref={fileRef} type="file" accept=".json,.csv,application/json,text/csv" className="hidden" onChange={handleFile} />
      {error && (
        <p role="alert" className="w-full text-sm text-status-abandoned">
          {error}
        </p>
      )}
      <ImportDialog
        plan={plan}
        onCancel={() => setPlan(null)}
        onConfirm={async (changes) => {
          await onApplyImport(changes);
          setPlan(null);
        }}
      />
    </>
  );
}
