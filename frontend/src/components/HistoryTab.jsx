import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Copy, RefreshCw, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { formatDate, formatHours } from "@/lib/format";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";
import { TimeSeriesChart } from "./charts/TimeSeriesChart";
import { GameCover } from "./GameCover";
import { useGameActions } from "./GameActions";

const MONTHS = 24;
const TIMELINE_PAGE = 60;
const FINISHED_SHOWN = 6;

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key, withYear = false) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "short", ...(withYear ? { year: "numeric" } : {}) });
};

function useHistoryData(steamId, statusSignature) {
  const [state, setState] = useState({ events: null, monthly: null, error: null });
  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, error: null }));
    Promise.all([api.getHistory(steamId), api.getMonthlyPlaytime(steamId, MONTHS)])
      .then(([events, monthly]) => !cancelled && setState({ events, monthly, error: null }))
      .catch((error) => !cancelled && setState({ events: null, monthly: null, error }));
    return () => {
      cancelled = true;
    };
    // statusSignature changes when a status changes elsewhere in the app: new events to show.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steamId, statusSignature]);
  return state;
}

/** Latest event per game that landed on `status` within the year. */
function finishesIn(events, status, year) {
  const byGame = new Map();
  events.forEach((event) => {
    if (event.toStatus !== status || new Date(event.changedUtc).getFullYear() !== year) return;
    const existing = byGame.get(event.appId);
    if (!existing || Date.parse(event.changedUtc) > Date.parse(existing.changedUtc)) byGame.set(event.appId, event);
  });
  return [...byGame.values()];
}

function Tile({ title, value, detail }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-1.5 sm:p-5 sm:pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
        <p className="truncate font-display text-2xl font-light tracking-tight sm:text-3xl">{value}</p>
        {detail && <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );
}

function SectionTitle({ title, detail, children }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
      </div>
      {children}
    </div>
  );
}

function GameButton({ appId, name }) {
  const { openDetails } = useGameActions();
  return (
    <button type="button" onClick={() => openDetails(appId)} className="min-w-0 truncate text-left hover:underline">
      {name}
    </button>
  );
}

function StatusTag({ status }) {
  if (!status) return <span className="text-muted-foreground">Added</span>;
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", meta?.dotClass)} aria-hidden="true" />
      {meta?.label ?? status}
    </span>
  );
}

function FinishedCard({ event, game, hours }) {
  const { openDetails } = useGameActions();
  const finishedOn = new Date(event.changedUtc);
  return (
    <li>
      <button
        type="button"
        onClick={() => openDetails(event.appId)}
        className="group block w-full overflow-hidden rounded-card border border-border bg-abyss text-left transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative">
          <GameCover appId={event.appId} name={event.name} src={game?.headerImageUrl} className="rounded-none border-0" />
          <span className="absolute left-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm">
            {finishedOn.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
        </div>
        <div className="space-y-1 px-3 py-2">
          <p className="truncate text-sm font-medium group-hover:underline" title={event.name}>{event.name}</p>
          <p className="flex items-center justify-between gap-2 text-xs tabular-nums text-muted-foreground">
            <span>{hours > 0 ? formatHours(hours * 60) : "No hours logged"}</span>
            {game?.reviewScore != null && (
              <span className="inline-flex items-center gap-1" title="Steam review score">
                <ThumbsUp className="h-3 w-3" aria-hidden="true" />
                {Math.round(game.reviewScore)}%
              </span>
            )}
          </p>
        </div>
      </button>
    </li>
  );
}

function FinishedShelf({ year, finished, finishedHours }) {
  const [showAll, setShowAll] = useState(false);
  const sorted = useMemo(
    () => [...finished].sort((a, b) => Date.parse(b.event.changedUtc) - Date.parse(a.event.changedUtc)),
    [finished]
  );
  const shown = showAll ? sorted : sorted.slice(0, FINISHED_SHOWN);
  return (
    <div className="rounded-card border border-border bg-card p-4 lg:col-span-2">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">Finished in {year}</h3>
        {finished.length > 0 && <span className="text-xs tabular-nums text-muted-foreground">Newest first</span>}
      </div>
      {finished.length ? (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {shown.map((item) => (
              <FinishedCard key={item.event.appId} event={item.event} game={item.game} hours={finishedHours(item)} />
            ))}
          </ul>
          {sorted.length > FINISHED_SHOWN && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setShowAll((value) => !value)}>
              {showAll ? "Show fewer" : `Show all ${sorted.length}`}
            </Button>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing marked Completed in {year} yet.</p>
      )}
    </div>
  );
}

function YearInReview({ year, years, onYearChange, events, monthly, games }) {
  const toast = useToast();
  const gamesById = useMemo(() => new Map(games.map((game) => [game.appId, game])), [games]);

  const review = useMemo(() => {
    const finished = finishesIn(events, "Completed", year).map((event) => ({ event, game: gamesById.get(event.appId) }));
    const abandoned = finishesIn(events, "Abandoned", year).map((event) => ({ event, game: gamesById.get(event.appId) }));
    const months = monthly.filter((entry) => entry.month.startsWith(`${year}-`));
    const minutes = months.reduce((sum, entry) => sum + entry.minutes, 0);
    const perGame = new Map();
    months.forEach((entry) =>
      entry.games.forEach((game) => perGame.set(game.appId, { ...game, minutes: (perGame.get(game.appId)?.minutes ?? 0) + game.minutes }))
    );
    const mostPlayed = [...perGame.values()].sort((a, b) => b.minutes - a.minutes).slice(0, 5);
    const finishedHours = ({ game }) => (game?.finishedHours != null ? Number(game.finishedHours) : game ? game.playtimeForeverMinutes / 60 : 0);
    const finishedTotal = finished.reduce((sum, item) => sum + finishedHours(item), 0);
    const bestRated = finished.filter(({ game }) => game?.reviewScore != null).sort((a, b) => b.game.reviewScore - a.game.reviewScore)[0];
    const longestAbandon = [...abandoned].sort((a, b) => finishedHours(b) - finishedHours(a))[0];
    const firstTrackedMonth = months.find((entry) => entry.minutes > 0)?.month;
    return { finished, abandoned, minutes, mostPlayed, bestRated, longestAbandon, finishedHours, finishedTotal, firstTrackedMonth };
  }, [events, monthly, year, gamesById]);

  const copySummary = async () => {
    const lines = [
      `My ${year} in games (Sift)`,
      `Finished: ${review.finished.length}${review.finished.length ? ` (${review.finished.map(({ event }) => event.name).join(", ")})` : ""}`,
      `Abandoned: ${review.abandoned.length}`,
      review.finished.length > 0 && `Hours to finish them: ${Math.round(review.finishedTotal).toLocaleString()}`,
      `Hours played: ${Math.round(review.minutes / 60).toLocaleString()}`,
      review.mostPlayed[0] && `Most played: ${review.mostPlayed[0].name} (${formatHours(review.mostPlayed[0].minutes)})`,
      review.bestRated && `Best-rated finish: ${review.bestRated.event.name}`,
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.show({ message: "Summary copied", duration: 3000 });
    } catch {
      toast.show({ message: "Couldn't copy to the clipboard", duration: 4000 });
    }
  };

  return (
    <section>
      <SectionTitle
        title="Year in review"
        detail={
          review.firstTrackedMonth && review.firstTrackedMonth !== `${year}-01`
            ? `Hours played are tracked from ${monthLabel(review.firstTrackedMonth, true)}.`
            : undefined
        }
      >
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="review-year">Year</label>
          <select
            id="review-year"
            value={year}
            onChange={(event) => onYearChange(Number(event.target.value))}
            className="h-8 rounded-full border border-border-strong bg-abyss px-3 text-[13px]"
          >
            {years.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={copySummary}>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copy summary
          </Button>
        </div>
      </SectionTitle>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile
          title="Finished"
          value={review.finished.length}
          detail={review.finished.length ? `${Math.round(review.finishedTotal).toLocaleString()} hrs to finish them` : null}
        />
        <Tile title="Abandoned" value={review.abandoned.length} detail={review.longestAbandon ? `Most sunk: ${review.longestAbandon.event.name}` : null} />
        <Tile
          title="Hours played"
          value={Math.round(review.minutes / 60).toLocaleString()}
          detail={review.mostPlayed[0] ? `Top: ${review.mostPlayed[0].name}` : "Counted from playtime gained between syncs"}
        />
        <Tile title="Best-rated finish" value={review.bestRated ? `${Math.round(review.bestRated.game.reviewScore)}%` : "—"} detail={review.bestRated?.event.name} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <FinishedShelf year={year} finished={review.finished} finishedHours={review.finishedHours} />
        <div className="rounded-card border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Most played in {year}</h3>
          {review.mostPlayed.length ? (
            <ol className="space-y-1.5 text-sm">
              {review.mostPlayed.map((game, index) => (
                <li key={game.appId} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                    <GameButton appId={game.appId} name={game.name} />
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatHours(game.minutes)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tracked playtime in {year}. Sift counts the hours Steam adds between syncs, so this fills in once you play and sync again on a later day.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Trends({ events, monthly, games }) {
  const trends = useMemo(() => {
    // Months from the first month with any tracked data, up to now.
    const now = new Date();
    const keys = Array.from({ length: 12 }, (_, index) => monthKey(new Date(now.getFullYear(), now.getMonth() - 11 + index, 1)));
    const minutesByMonth = new Map(monthly.map((entry) => [entry.month, entry]));

    const hours = keys
      .map((key) => {
        const entry = minutesByMonth.get(key);
        return {
          key,
          label: monthLabel(key, key.endsWith("-01")),
          title: monthLabel(key, true),
          value: Math.round(((entry?.minutes ?? 0) / 60) * 10) / 10,
          detail: entry?.games[0] ? `Top: ${entry.games[0].name}` : null,
        };
      });
    const firstHours = hours.findIndex((point) => point.value > 0);

    const finishedCounts = new Map();
    events.forEach((event) => {
      if (event.toStatus !== "Completed") return;
      const key = monthKey(new Date(event.changedUtc));
      finishedCounts.set(key, (finishedCounts.get(key) ?? 0) + 1);
    });
    const finished = keys.map((key) => ({
      key,
      label: monthLabel(key, key.endsWith("-01")),
      title: monthLabel(key, true),
      value: finishedCounts.get(key) ?? 0,
    }));

    // Backlog size at each month end, worked backwards from today through status changes.
    // A missing fromStatus means the game had no entry yet, i.e. it was in Backlog by default.
    // Apps now marked Other never counted, so their history is left out.
    const counted = new Set(games.map((game) => game.appId));
    const sorted = events.filter((event) => counted.has(event.appId)).sort((a, b) => Date.parse(b.changedUtc) - Date.parse(a.changedUtc));
    let size = games.filter((game) => game.status === "Backlog").length;
    let cursor = 0;
    const backlogByMonth = new Map();
    [...keys].reverse().forEach((key) => {
      const [year, month] = key.split("-").map(Number);
      const monthEnd = Date.UTC(year, month, 1);
      while (cursor < sorted.length && Date.parse(sorted[cursor].changedUtc) >= monthEnd) {
        const event = sorted[cursor++];
        if (event.toStatus === "Backlog") size -= 1;
        if ((event.fromStatus ?? "Backlog") === "Backlog") size += 1;
      }
      backlogByMonth.set(key, size);
    });
    const firstEvent = sorted.length ? monthKey(new Date(sorted[sorted.length - 1].changedUtc)) : null;
    const backlog = keys
      .filter((key) => firstEvent && key >= firstEvent)
      .map((key) => ({ key, label: monthLabel(key, key.endsWith("-01")), title: `End of ${monthLabel(key, true)}`, value: backlogByMonth.get(key) }));

    return { hours: firstHours === -1 ? [] : hours.slice(firstHours), finished, backlog };
  }, [events, monthly, games]);

  return (
    <section>
      <SectionTitle title="Trends" detail="The last 12 months." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-card border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">Hours played per month</h3>
          {trends.hours.length ? (
            <TimeSeriesChart data={trends.hours} label="Hours played per month" format={(value) => `${value.toLocaleString()} hrs`} colorVar="--status-playing" />
          ) : (
            <p className="text-sm text-muted-foreground">Builds up from each sync. Check back after you&apos;ve played and synced.</p>
          )}
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">Games finished per month</h3>
          <TimeSeriesChart data={trends.finished} label="Games finished per month" format={(value) => `${value} ${value === 1 ? "game" : "games"}`} colorVar="--status-completed" />
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">Backlog size</h3>
          {trends.backlog.length > 1 ? (
            <>
              <TimeSeriesChart kind="line" data={trends.backlog} label="Backlog size at month end" format={(value) => `${value} games`} colorVar="--status-backlog" />
              <p className="mt-2 text-[11px] text-muted-foreground">From status changes; games newly added to your library aren&apos;t counted.</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Needs at least two months of status changes.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Timeline({ events }) {
  const [shown, setShown] = useState(TIMELINE_PAGE);
  const groups = useMemo(() => {
    const byMonth = new Map();
    events.slice(0, shown).forEach((event) => {
      const key = monthKey(new Date(event.changedUtc));
      byMonth.set(key, [...(byMonth.get(key) ?? []), event]);
    });
    return [...byMonth.entries()];
  }, [events, shown]);

  return (
    <section>
      <SectionTitle title="Timeline" detail="Every status change, newest first." />
      {events.length ? (
        <div className="space-y-5">
          {groups.map(([key, monthEvents]) => (
            <div key={key}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{monthLabel(key, true)}</h3>
              <ol className="divide-y divide-border rounded-card border border-border bg-card px-4">
                {monthEvents.map((event) => (
                  <li key={event.id} className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 py-2 text-sm sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]">
                    <span className="text-xs tabular-nums text-muted-foreground">{formatDate(event.changedUtc, { short: true }).replace(/ \d{4}$/, "")}</span>
                    <GameButton appId={event.appId} name={event.name} />
                    <span className="col-start-2 flex items-center gap-2 text-xs text-muted-foreground sm:col-start-3">
                      <StatusTag status={event.fromStatus} />
                      <ArrowRight className="h-3 w-3" aria-label="to" />
                      <span className="text-foreground"><StatusTag status={event.toStatus} /></span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          {shown < events.length && (
            <Button variant="outline" size="sm" onClick={() => setShown((count) => count + TIMELINE_PAGE)}>
              Show older ({events.length - shown} more)
            </Button>
          )}
        </div>
      ) : (
        <p className="rounded-card border border-border bg-card p-4 text-sm text-muted-foreground">
          No status changes recorded yet. From now on, every change you make is logged here with its date.
        </p>
      )}
    </section>
  );
}

export function HistoryTab({ steamId, games }) {
  const statusSignature = useMemo(() => games.map((game) => `${game.appId}:${game.status}`).join(","), [games]);
  const { events, monthly, error } = useHistoryData(steamId, statusSignature);
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);

  const years = useMemo(() => {
    const found = new Set([thisYear]);
    events?.forEach((event) => found.add(new Date(event.changedUtc).getFullYear()));
    monthly?.forEach((entry) => entry.minutes > 0 && found.add(Number(entry.month.slice(0, 4))));
    return [...found].sort((a, b) => b - a);
  }, [events, monthly, thisYear]);

  if (error) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-status-abandoned/40 bg-status-abandoned/10 p-4 text-sm">
        History couldn&apos;t be loaded: {error.message}
        <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }
  if (!events || !monthly) return <p className="rounded-card border border-border bg-card p-4 text-sm text-muted-foreground">Loading history…</p>;

  return (
    <div className="space-y-10">
      <YearInReview year={year} years={years} onYearChange={setYear} events={events} monthly={monthly} games={games} />
      <Trends events={events} monthly={monthly} games={games} />
      <Timeline events={events} />
    </div>
  );
}
