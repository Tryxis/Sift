import { cn } from "@/lib/utils";

/** Thin bar; values over 100% fill the bar and are flagged in the label instead. */
export function ProgressBar({ percent, className, barClassName = "bg-status-playing", label }) {
  const clamped = Math.max(0, Math.min(percent ?? 0, 100));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
      className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-300", barClassName)} style={{ width: `${clamped}%` }} />
    </div>
  );
}
