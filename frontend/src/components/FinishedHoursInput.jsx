import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Edits a game's Finished Hours; saves on blur or Enter, Escape reverts. The unit shows in wide containers. */
export function FinishedHoursInput({ game, onUpdateGame, className, showUnit = false }) {
  const stored = game.finishedHours?.toString() ?? "";
  const [value, setValue] = useState(stored);

  useEffect(() => setValue(stored), [stored]);

  const save = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      if (game.finishedHours != null) onUpdateGame(game.appId, { clearFinishedHours: true });
      return;
    }
    const hours = Number(trimmed);
    if (!Number.isFinite(hours) || hours < 0 || hours > 1_000_000) {
      setValue(stored);
      return;
    }
    if (hours !== game.finishedHours) onUpdateGame(game.appId, { finishedHours: hours });
  };

  return (
    <span className={cn("relative block", className)}>
      <input
        aria-label={`Finished hours for ${game.name}`}
        type="number"
        inputMode="decimal"
        min="0"
        max="1000000"
        step="0.1"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setValue(stored);
            // Let blur run after the reset so nothing is saved.
            requestAnimationFrame(() => event.target.blur());
          }
        }}
        placeholder="—"
        className={cn(
          "h-8 w-full min-w-0 rounded-well border border-border-strong bg-abyss px-2 text-right text-base tabular-nums placeholder:text-muted-foreground/60 sm:text-sm",
          showUnit && "px-1.5 @[14rem]:px-2 @[14rem]:pr-8"
        )}
      />
      {showUnit && (
        <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 text-[11px] text-muted-foreground @[14rem]:block">hrs</span>
      )}
    </span>
  );
}
