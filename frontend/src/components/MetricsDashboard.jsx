import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUSES, STATUS_META } from "@/lib/status";
import { LibraryInsights } from "./LibraryInsights";

function hoursPlayed(game) {
  return game.playtimeForeverMinutes / 60;
}

function expectedHours(game) {
  return game.timeToBeatMainMinutes == null ? null : game.timeToBeatMainMinutes / 60;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function median(values) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function formatHours(hours, digits = 1) {
  if (hours == null || !Number.isFinite(hours)) return "—";
  return `${hours.toLocaleString(undefined, { maximumFractionDigits: digits })} h`;
}

function formatPercent(value) {
  return value == null || !Number.isFinite(value) ? "—" : `${value.toFixed(1)}%`;
}

function Stat({ label, value, detail }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-2xl font-light tracking-tight sm:text-3xl">{value}</p>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, library, filtered }) {
  return (
    <tr className="border-t border-border">
      <th scope="row" className="py-2 pr-3 text-left font-normal text-muted-foreground">{label}</th>
      <td className="py-2 px-2 text-right tabular-nums">{library}</td>
      <td className="py-2 pl-2 text-right tabular-nums">{filtered}</td>
    </tr>
  );
}

function SectionTitle({ title, detail }) {
  return (
    <div className="mb-3">
      <h3 className="font-display text-lg font-medium">{title}</h3>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

export function MetricsDashboard({ games, scopedGames, filteredGames }) {
  const metrics = useMemo(() => {
    const summarize = (items) => {
      const statusCounts = Object.fromEntries(STATUSES.map((status) => [status, 0]));
      items.forEach((game) => {
        statusCounts[game.status] = (statusCounts[game.status] ?? 0) + 1;
      });
      const playedHours = sum(items.map(hoursPlayed));
      const finishedHoursGames = items.filter((game) => game.finishedHours != null);
      const finishedHours = sum(finishedHoursGames.map((game) => Number(game.finishedHours)));
      const estimates = items.map(expectedHours).filter((value) => value != null);
      const expected = sum(estimates);
      const noEstimateCount = items.length - estimates.length;
      const completed = statusCounts.Completed;
      const withVerdict = items.length - statusCounts.Backlog;

      return {
        statusCounts,
        count: items.length,
        playedHours,
        finishedHours,
        finishedHoursGameCount: finishedHoursGames.length,
        expectedHours: expected,
        noEstimateCount,
        completed,
        withVerdict,
        completion: items.length ? (completed / items.length) * 100 : 0,
        playedVsExpected: expected ? (playedHours / expected) * 100 : null,
      };
    };

    const dnf = games
      .filter(
        (game) =>
          game.status === "Abandoned" &&
          game.finishedHours != null &&
          game.finishedHours > 0 &&
          game.timeToBeatMainMinutes != null &&
          game.timeToBeatMainMinutes > 0
      )
      .map((game) => ({
        ...game,
        expected: expectedHours(game),
        percentThrough: (game.finishedHours / expectedHours(game)) * 100,
      }))
      .sort((a, b) => b.percentThrough - a.percentThrough);

    const dnfPercentages = dnf.map((game) => game.percentThrough);
    const dnfHours = dnf.map((game) => Number(game.finishedHours));
    const dnfExpected = dnf.map((game) => game.expected);

    return {
      library: summarize(games),
      scoped: summarize(scopedGames),
      filtered: summarize(filteredGames),
      dnf: {
        total: games.filter((game) => game.status === "Abandoned").length,
        loggedCount: dnf.length,
        averageHours: dnf.length ? sum(dnfHours) / dnf.length : null,
        medianHours: median(dnfHours),
        averagePercent: dnf.length ? sum(dnfPercentages) / dnf.length : null,
        medianPercent: median(dnfPercentages),
        hoursSunk: sum(dnfHours),
        expectedHours: sum(dnfExpected),
        breakdown: dnf,
      },
    };
  }, [games, scopedGames, filteredGames]);

  const rows = [
    ["Games", metrics.library, metrics.filtered, (m) => m.count],
    ["Games with a verdict", metrics.library, metrics.filtered, (m) => m.withVerdict],
    ...STATUSES.filter((status) => status !== "Backlog").map((status) => [
      status,
      metrics.library,
      metrics.filtered,
      (m) => m.statusCounts[status],
    ]),
    ["Completion", metrics.library, metrics.filtered, (m) => formatPercent(m.completion)],
    ["Hours played", metrics.library, metrics.filtered, (m) => formatHours(m.playedHours)],
    ["Hours expected (HLTB main story)", metrics.library, metrics.filtered, (m) => formatHours(m.expectedHours)],
    ["Played vs expected", metrics.library, metrics.filtered, (m) => formatPercent(m.playedVsExpected)],
  ];

  return (
    <section className="relative z-10 space-y-8 pt-6" aria-label="Library metrics">
      <div>
        <SectionTitle
          title="Metrics"
          detail="Headline figures follow your search and range filters; the status filter only affects the Filtered column below. Abandonment analysis and the insights below cover the full library."
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Games" value={metrics.scoped.count} />
          <Stat label="Completed" value={metrics.scoped.statusCounts.Completed} detail={formatPercent(metrics.scoped.completion)} />
          <Stat label="Playing" value={metrics.scoped.statusCounts.Playing} />
          <Stat
            label="Hours played"
            value={formatHours(metrics.scoped.playedHours)}
            detail={`${formatHours(metrics.scoped.expectedHours)} HLTB estimated`}
          />
          <Stat label="DNF" value={metrics.scoped.statusCounts.Abandoned} />
          <Stat label="Technical problem" value={metrics.scoped.statusCounts.Problem} />
          <Stat
            label="Finished hours"
            value={formatHours(metrics.scoped.finishedHours)}
            detail={`Recorded for ${metrics.scoped.finishedHoursGameCount} games`}
          />
          <Stat
            label="No HLTB estimate"
            value={metrics.scoped.noEstimateCount}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle title="Status & progress" detail="Library totals compared with the current filtered selection." />
          <div className="overflow-x-auto rounded-card border border-border bg-card px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="py-2 pr-3 text-left font-medium">Metric</th>
                  <th className="px-2 py-2 text-right font-medium">Library</th>
                  <th className="py-2 pl-2 text-right font-medium">Filtered</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, library, filtered, select]) => (
                  <MetricRow
                    key={label}
                    label={label}
                    library={select(library)}
                    filtered={select(filtered)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <SectionTitle
            title="When do I DNF?"
            detail="For abandoned games with Finished Hours recorded, compared with the HLTB main-story estimate."
          />
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="DNF games"
              value={metrics.dnf.total}
              detail={`${metrics.dnf.loggedCount} with hours recorded · ${formatPercent(
                metrics.library.withVerdict ? (metrics.dnf.total / metrics.library.withVerdict) * 100 : 0
              )} of games with a verdict`}
            />
            <Stat
              label="Avg. time before DNF"
              value={formatHours(metrics.dnf.averageHours)}
              detail={`Median ${formatHours(metrics.dnf.medianHours)}`}
            />
            <Stat
              label="Avg. % through"
              value={formatPercent(metrics.dnf.averagePercent)}
              detail={`Median ${formatPercent(metrics.dnf.medianPercent)}`}
            />
            <Stat
              label="Hours sunk"
              value={formatHours(metrics.dnf.hoursSunk)}
              detail={`of ${formatHours(metrics.dnf.expectedHours)} estimated`}
            />
          </div>
        </div>
      </div>

      <div>
        <div>
          <SectionTitle title="DNF breakdown" detail="Sorted by the share of the HLTB main-story estimate completed before stopping." />
          <div className="max-h-80 overflow-auto rounded-card border border-border bg-card px-4">
            {metrics.dnf.breakdown.length ? (
              <ol className="divide-y divide-border">
                {metrics.dnf.breakdown.map((game, index) => (
                  <li key={game.appId} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 py-2">
                    <span className="text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                    <span className="min-w-0 truncate text-sm" title={game.name}>{game.name}</span>
                    <span className="text-right text-xs tabular-nums text-muted-foreground">
                      {formatPercent(game.percentThrough)}
                      <span className="ml-2 hidden sm:inline">
                        {formatHours(Number(game.finishedHours))} / {formatHours(game.expected)}
                      </span>
                    </span>
                    <span className="col-start-2 col-span-2 h-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-status-abandoned"
                        style={{ width: `${Math.min(game.percentThrough, 100)}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">Record Finished Hours for abandoned games to see this breakdown.</p>
            )}
          </div>
        </div>
      </div>

      <LibraryInsights games={games} />

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground" aria-label="Status key">
        {STATUSES.map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${STATUS_META[status].dotClass}`} />
            {STATUS_META[status].label}
          </span>
        ))}
      </div>
    </section>
  );
}
