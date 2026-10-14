import { ChevronDown, ListPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { STATUSES, STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Sticky bar for acting on the games ticked in the table. */
export function BulkActionsBar({ count, matchingCount, onSelectAllMatching, onClear, onSetStatus, onSetPlayedBefore, onAddToQueue }) {
  if (!count) return null;

  return (
    <div className="sticky top-2 z-30 mb-3 flex flex-wrap items-center gap-2 rounded-card border border-status-playing/40 bg-popover/95 px-3 py-2 text-sm shadow-[0_8px_30px_hsl(220_33%_2%/0.6)] backdrop-blur">
      <span className="font-medium tabular-nums">{count} selected</span>
      {count < matchingCount && (
        <button type="button" onClick={onSelectAllMatching} className="text-xs text-status-playing hover:underline">
          Select all {matchingCount}
        </button>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Set status
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Finished Hours are left unchanged</DropdownMenuLabel>
            {STATUSES.map((status) => (
              <DropdownMenuItem key={status} onSelect={() => onSetStatus(status)}>
                <span className={cn("h-2.5 w-2.5 rounded-full", STATUS_META[status].dotClass)} />
                {STATUS_META[status].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Played before
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => onSetPlayedBefore(true)}>Yes</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSetPlayedBefore(false)}>No</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" onClick={onAddToQueue}>
          <ListPlus className="h-3.5 w-3.5" aria-hidden="true" />
          Add to Up Next
        </Button>
        <Button variant="ghost" size="icon" onClick={onClear} aria-label="Clear selection">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
