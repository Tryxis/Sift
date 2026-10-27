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
const SHELF_SHOWN = 6;

/** Statuses that mean a decision was made about a game: it's been sifted out of the backlog. */
const SIFTED_STATUSES = ["Completed", "CompletedBefore", "Abandoned", "Problem", "NotApplicable"];

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key, withYear = false) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "short", ...(withYear ? { year: "numeric" } : {}) });
};

function useHistoryData(steamId, statusSignature, reloadKey) {
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
  }, [steamId, statusSignature, reloadKey]);
  return state;
}

/**
 * Games sifted in the year: each game's latest status change that year, kept when it landed on a
 * decision (finished, abandoned, problem, other). A game that went Playing → Completed counts once, as
 * Completed; one moved back to Backlog or Playing by the end of the year isn't counted.
 */
function siftedIn(events, year) {
  const latest = new Map();
  events.forEach((event) => {
    if (new Date(event.changedUtc).getFullYear() !== year) return;
    const existing = latest.get(event.appId);
    if (!existing || Date.parse(event.changedUtc) > Date.parse(existing.changedUtc)) latest.set(event.appId, event);
  });
  return [...latest.values()].filter((event) => SIFTED_STATUSES.includes(event.toStatus));
}

function Tile({ title, value, detail, onClick, isSelected, className, wrapDetail = false }) {
  const card = (
    <Card className={cn("h-full transition-colors", isSelected && "border-foreground/50", !onClick && className)}>
      <CardHeader className="p-4 pb-1.5 sm:p-5 sm:pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
        <p className="truncate font-display text-2xl font-light tracking-tight sm:text-3xl">{value}</p>
        {detail && <p className={cn("mt-1 text-xs text-muted-foreground", wrapDetail ? "line-clamp-2" : "truncate")}>{detail}</p>}
      </CardContent>
    </Card>
  );
  if (!onClick) return card;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      title="Show these games below"
      className={cn("rounded-card text-left [&>div]:hover:border-border-strong", className)}
    >
      {card}
    </button>
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

function ShelfCard({ event, game, hours, showStatus }) {
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
          {showStatus && (
            <span className="absolute bottom-2 left-2 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm">
              <StatusTag status={event.toStatus} />
            </span>
          )}
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

function SiftedShelf({ year, sifted, group, onGroupChange, gameHours }) {
  const [showAll, setShowAll] = useState(false);
  const counts = useMemo(() => {
    const byStatus = new Map(SIFTED_STATUSES.map((status) => [status, 0]));
    sifted.forEach(({ event }) => byStatus.set(event.toStatus, byStatus.get(event.toStatus) + 1));
    return byStatus;
  }, [sifted]);
  const sorted = useMemo(
    () => sifted
      .filter(({ event }) => group === "All" || event.toStatus === group)
      .sort((a, b) => Date.parse(b.event.changedUtc) - Date.parse(a.event.changedUtc)),
    [sifted, group]
  );
  const shown = showAll ? sorted : sorted.slice(0, SHELF_SHOWN);
  const chips = [["All", "All", sifted.length], ...SIFTED_STATUSES.map((status) => [status, STATUS_META[status].label, counts.get(status)])];

  return (
    <div className="rounded-card border border-border bg-card p-4 lg:col-span-2">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-medium text-muted-foreground">Sifted in {year}</h3>
        {sorted.length > 0 && <span className="text-xs tabular-nums text-muted-foreground">Newest first</span>}
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Show games by status">
        {chips.map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            aria-pressed={group === id}
            disabled={count === 0 && id !== "All"}
            onClick={() => {
              onGroupChange(id);
              setShowAll(false);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-40",
              group === id ? "border-foreground/60 bg-muted text-foreground" : "border-border-strong text-muted-foreground hover:text-foreground"
            )}
          >
            {id !== "All" && <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[id].dotClass)} aria-hidden="true" />}
            {label}
            <span className="tabular-nums">{count}</span>
          </button>
        ))}
      </div>
      {sorted.length ? (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {shown.map((item) => (
              <ShelfCard key={item.event.appId} event={item.event} game={item.game} hours={gameHours(item)} showStatus={group === "All"} />
            ))}
          </ul>
          {sorted.length > SHELF_SHOWN && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setShowAll((value) => !value)}>
              {showAll ? "Show fewer" : `Show all ${sorted.length}`}
            </Button>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {group === "All" ? `Nothing sifted in ${year} yet.` : `Nothing marked ${STATUS_META[group].label} in ${year} yet.`}
        </p>
      )}
    </div>
  );
}

function YearInReview({ year, years, onYearChange, events, monthly, games }) {
  const toast = useToast();
  const [group, setGroup] = useState("All");
  const gamesById = useMemo(() => new Map(games.map((game) => [game.appId, game])), [games]);

  const review = useMemo(() => {
    const sifted = siftedIn(events, year).map((event) => ({ event, game: gamesById.get(event.appId) }));
    const countOf = (...statuses) => sifted.filter(({ event }) => statuses.includes(event.toStatus)).length;
    const finished = sifted.filter(({ event }) => event.toStatus === "Completed");
    const abandoned = sifted.filter(({ event }) => event.toStatus === "Abandoned");
    // "5 finished · 2 abandoned · 2 problem", matching the Finished and Abandoned tiles.
    const breakdown = [
      [finished.length, "finished"],
      [countOf("CompletedBefore"), "completed before"],
      [abandoned.length, "abandoned"],
      [countOf("Problem"), "problem"],
      [countOf("NotApplicable"), "other"],
    ].filter(([count]) => count > 0).map(([count, label]) => `${count} ${label}`).join(" · ");
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
    return { sifted, breakdown, finished, abandoned, minutes, mostPlayed, bestRated, longestAbandon, finishedHours, finishedTotal, firstTrackedMonth };
  }, [events, monthly, year, gamesById]);

  const copySummary = async () => {
    const lines = [
      `My ${year} in games (Sift)`,
      `Sifted: ${review.sifted.length}${review.breakdown ? ` (${review.breakdown})` : ""}`,
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tile
          title="Sifted"
          value={review.sifted.length}
          detail={review.breakdown || `No decisions made in ${year} yet`}
          wrapDetail
          onClick={() => setGroup("All")}
          isSelected={group === "All"}
          className="col-span-2 md:col-span-1"
        />
        <Tile
          title="Finished"
          value={review.finished.length}
          detail={review.finished.length ? `${Math.round(review.finishedTotal).toLocaleString()} hrs to finish them` : null}
          onClick={() => setGroup("Completed")}
          isSelected={group === "Completed"}
        />
        <Tile
          title="Abandoned"
          value={review.abandoned.length}
          detail={review.longestAbandon ? `Most sunk: ${review.longestAbandon.event.name}` : null}
          onClick={() => setGroup("Abandoned")}
          isSelected={group === "Abandoned"}
        />
        <Tile
          title="Hours played"
          value={Math.round(review.minutes / 60).toLocaleString()}
          detail={review.mostPlayed[0] ? `Top: ${review.mostPlayed[0].name}` : "Counted from playtime gained between syncs"}
        />
        <Tile
          title="Best-rated finish"
          value={review.bestRated ? `${Math.round(review.bestRated.game.reviewScore)}%` : "—"}
          detail={review.bestRated?.event.name}
          className="col-span-2 md:col-span-1"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <SiftedShelf year={year} sifted={review.sifted} group={group} onGroupChange={setGroup} gameHours={review.finishedHours} />
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
  const [reloadKey, setReloadKey] = useState(0);
  const { events, monthly, error } = useHistoryData(steamId, statusSignature, reloadKey);
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
