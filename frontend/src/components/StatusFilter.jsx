import { cn } from "@/lib/utils";
import { STATUSES, STATUS_META } from "@/lib/status";

const OPTIONS = ["All", ...STATUSES];
const label = (option) => STATUS_META[option]?.label ?? option;

function chipState(option, selectedStatuses, excludedStatuses) {
  if (option === "All") return selectedStatuses.length === 0 && excludedStatuses.length === 0 ? "on" : "off";
  if (selectedStatuses.includes(option)) return "on";
  if (excludedStatuses.includes(option)) return "excluded";
  return "off";
}

const HINTS = {
  off: (option) => `Show only ${option}`,
  on: (option) => `Hide ${option} instead`,
  excluded: (option) => `Stop hiding ${option}`,
};

export function StatusFilter({ selectedStatuses, excludedStatuses, counts, onCycle, onClear, className }) {
  return (
    // On phones the chips scroll sideways in one row instead of wrapping into three.
    <div
      className={cn(
        "-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden",
        className
      )}
      role="group"
      aria-label="Filter by status. Click a status to show only it, again to hide it, and again to reset."
    >
      {OPTIONS.map((option) => {
        const state = chipState(option, selectedStatuses, excludedStatuses);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={state === "excluded" ? "mixed" : state === "on"}
            title={option === "All" ? "Show every status" : HINTS[state](label(option))}
            onClick={() => (option === "All" ? onClear() : onCycle(option))}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-[13px] transition-colors sm:h-8 sm:px-3.5",
              state === "on" && "border-foreground/70 bg-foreground/[0.06] text-foreground",
              state === "excluded" && "border-dashed border-status-abandoned/60 text-muted-foreground",
              state === "off" && "border-border-strong text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground"
            )}
          >
            {option !== "All" && <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[option].dotClass, state === "excluded" && "opacity-40")} />}
            {state === "excluded" ? `Not ${label(option)}` : label(option)}
            <span className="tabular-nums text-muted-foreground">{counts[option] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
