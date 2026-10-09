import { Check } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { STATUSES, STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";

export function StatusPicker({ status, onChange }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Status: ${status}. Change status`}
          className="group -m-2 flex h-11 w-11 items-center justify-center rounded-full sm:m-0 sm:h-7 sm:w-7"
        >
          <span
            className={cn(
              "h-3.5 w-3.5 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-card transition-shadow group-hover:ring-muted-foreground/70 group-data-[state=open]:ring-foreground/80",
              STATUS_META[status].dotClass
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-44">
        <DropdownMenuLabel>Set status</DropdownMenuLabel>
        {STATUSES.map((s) => (
          <DropdownMenuItem key={s} onSelect={() => s !== status && onChange(s)}>
            <span className={cn("h-2.5 w-2.5 rounded-full", STATUS_META[s].dotClass)} />
            <span className="flex-1">{STATUS_META[s].label}</span>
            {s === status && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
