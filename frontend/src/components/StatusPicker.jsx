import { useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { STATUSES, STATUS_META, getStatusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

export function StatusPicker({ status, playedBefore = false, onChange, boxed = false }) {
  const triggerRef = useRef(null);
  const currentMeta = getStatusMeta(status, playedBefore);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
          aria-label={`Status: ${status}. Change status`}
          className={cn(
            boxed
              ? "group flex h-8 w-full shrink-0 items-center justify-center gap-1 rounded-well border border-border-strong bg-abyss px-1.5"
              : "group -m-2 flex h-11 w-fit shrink-0 items-center justify-center gap-1.5 rounded-full px-2 sm:m-0 sm:h-7 sm:px-1.5"
          )}
        >
          <span
            className={cn(
              "h-3.5 w-3.5 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-card transition-shadow group-hover:ring-muted-foreground/70 group-data-[state=open]:ring-foreground/80",
              currentMeta.dotClass
            )}
          />
          {boxed && <span className="status-picker-label whitespace-nowrap text-[11px] text-muted-foreground">{currentMeta.label}</span>}
          {boxed && <ChevronDown className="status-picker-label h-3 w-3 text-muted-foreground" aria-hidden="true" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-44">
        <DropdownMenuLabel>Set status</DropdownMenuLabel>
        {STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onSelect={() => s !== status && onChange(s, triggerRef.current?.getBoundingClientRect() ?? null)}
          >
            <span className={cn("h-2.5 w-2.5 rounded-full", getStatusMeta(s, s === "Completed" && playedBefore).dotClass)} />
            <span className="flex-1">{STATUS_META[s].label}</span>
            {s === status && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
