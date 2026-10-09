import { cn } from "@/lib/utils";
import { COMPLETED_BEFORE_FILTER, STATUSES, STATUS_META } from "@/lib/status";

export function StatusFilter({ selectedStatuses, counts, onToggle, onClear }) {
  const options = ["All", ...STATUSES, COMPLETED_BEFORE_FILTER];
  return (
    <div className="flex w-fit max-w-full flex-wrap gap-2" role="group" aria-label="Filter by status">
      {options.map((option) => {
        const active = option === "All" ? selectedStatuses.length === 0 : selectedStatuses.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => option === "All" ? onClear() : onToggle(option)}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-[12px] transition-colors sm:h-8 sm:px-3.5 sm:text-[13px]",
              active
                ? "border-foreground/70 text-foreground"
                : "border-border-strong text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground"
            )}
          >
            {option !== "All" && <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[option].dotClass)} />}
            {option}
            <span className="tabular-nums text-muted-foreground">{counts[option] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
