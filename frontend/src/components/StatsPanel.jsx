import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STAT_STATUSES, STATUS_META, isFinished } from "@/lib/status";
import { hoursLeftToBeat, totalHours } from "@/lib/format";
import { cn } from "@/lib/utils";

function StatCard({ title, value, detail, className }) {
  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-1.5 sm:p-5 sm:pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
        <p className="font-display text-2xl font-light tracking-tight sm:text-4xl">{value}</p>
        <p className="mt-1.5 text-xs text-muted-foreground sm:mt-2 sm:text-sm">{detail}</p>
      </CardContent>
    </Card>
  );
}

// A circle with circumference 100 lets each segment's dash length be its percentage directly.
const RADIUS = 100 / (2 * Math.PI);
const GAP = 1.2;

function Donut({ segments, total, isHighlighted, children }) {
  let offset = 0;
  return (
    <div className="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28">
      <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="20" cy="20" r={RADIUS} fill="none" strokeWidth="4.5" className="stroke-muted" />
        {total > 0 && segments.map(({ status, count }) => {
          const length = (count / total) * 100;
          const gap = segments.length > 1 ? Math.min(GAP, length / 2) : 0;
          const dash = `${Math.max(length - gap, 0)} ${100 - length + gap}`;
          const circle = (
            <circle
              key={status}
              cx="20"
              cy="20"
              r={RADIUS}
              fill="none"
              strokeWidth="4.5"
              stroke={STATUS_META[status].hex}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              className="transition-opacity duration-200"
              opacity={isHighlighted(status) ? 1 : 0.18}
            />
          );
          offset += length;
          return circle;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function StatsPanel({ games, libraryCount, inViewCount, selectedStatuses, onToggleStatus, isScoped, className = "" }) {
  const stats = useMemo(() => {
    const counts = STAT_STATUSES.map((s) => ({ status: s, count: games.filter((g) => g.status === s).length }));
    const completed = games.filter(isFinished).length;
    const played = games.filter((g) => g.playtimeForeverMinutes > 0).length;
    return {
      counts,
      completed,
      played,
      unplayed: games.length - played,
      hours: totalHours(games),
      completionRate: games.length ? Math.round((completed / games.length) * 100) : 0,
      leftToBeat: hoursLeftToBeat(games),
    };
  }, [games]);

  const hasSelection = selectedStatuses.length > 0;
  const isHighlighted = (status) => !hasSelection || selectedStatuses.includes(status);

  const scopeLabel = isScoped ? `${games.length.toLocaleString()} of ${libraryCount.toLocaleString()} games match your filters` : "Whole library";

  return (
    <section className={cn("relative z-10", className)} aria-label="Library stats">
      <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        {isScoped && <span className="h-1.5 w-1.5 rounded-full bg-status-playing" aria-hidden="true" />}
        {scopeLabel}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-[1.5fr_1fr_1fr] lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <Card className="col-span-2 md:col-span-1 md:row-span-2 lg:row-span-1">
          <CardHeader className="p-4 pb-1.5 sm:p-5 sm:pb-2">
            <CardTitle>Status breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-5 p-4 pt-0 sm:gap-6 sm:p-5 sm:pt-0">
            <Donut segments={stats.counts.filter((c) => c.count > 0)} total={games.length} isHighlighted={isHighlighted}>
              <span className="font-display text-xl font-light tabular-nums sm:text-2xl">
                {(hasSelection ? inViewCount : games.length).toLocaleString()}
              </span>
              <span className="text-[11px] text-muted-foreground">{hasSelection ? "in view" : "games"}</span>
            </Donut>
            <ul className="grid min-w-0 flex-1 gap-0.5 text-sm" aria-label="Filter by status">
              {stats.counts.map(({ status, count }) => {
                const selected = selectedStatuses.includes(status);
                return (
                  <li key={status}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onToggleStatus(status)}
                      title={selected ? `Stop filtering by ${STATUS_META[status].label}` : `Show only ${STATUS_META[status].label}`}
                      className={cn(
                        "-mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-md px-2 py-0.5 text-left transition-colors hover:bg-muted",
                        hasSelection && !isHighlighted(status) && "text-muted-foreground"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_META[status].dotClass, selected && "ring-2 ring-foreground/50 ring-offset-1 ring-offset-card")} />
                        <span className="truncate">{STATUS_META[status].label}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <StatCard
          title="Hours logged"
          value={stats.hours.toLocaleString()}
          detail={`${stats.played} played, ${stats.unplayed} never launched`}
        />
        <StatCard title="Completed" value={`${stats.completionRate}%`} detail={`${stats.completed} of ${games.length} games`} />
        <StatCard
          className="col-span-2 lg:col-span-1"
          title="Left to beat"
          value={stats.leftToBeat.gameCount ? `${stats.leftToBeat.hours.toLocaleString()} hrs` : "—"}
          detail={
            stats.leftToBeat.gameCount
              ? `Main stories across ${stats.leftToBeat.gameCount} unfinished games`
              : "No unfinished games with an estimate"
          }
        />
      </div>
    </section>
  );
}
