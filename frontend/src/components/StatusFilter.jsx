import { cn } from "@/lib/utils";
import { STATUSES, STATUS_META } from "@/lib/status";

// Filter tab pills: active and inactive share a background; only the border changes.
export function StatusFilter({ value, counts, onChange }) {
  const options = ["All", ...STATUSES];
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Filter by status">
      {options.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option)}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] transition-colors sm:h-8",
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
