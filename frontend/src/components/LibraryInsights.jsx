import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { findDuplicates } from "@/lib/gameMath";
import { formatHours } from "@/lib/format";
import { getStatusMeta, isFinished } from "@/lib/status";
import { cn } from "@/lib/utils";
import { useGameActions } from "./GameActions";

const LENGTH_BUCKETS = [
  ["Under 5 h", (h) => h < 5],
  ["5–15 h", (h) => h >= 5 && h < 15],
  ["15–40 h", (h) => h >= 15 && h < 40],
  ["40 h+", (h) => h >= 40],
];

const SCORE_BUCKETS = [
  ["Under 70%", (s) => s < 70],
  ["70–80%", (s) => s >= 70 && s < 80],
  ["80–90%", (s) => s >= 80 && s < 90],
  ["90%+", (s) => s >= 90],
];

function median(values) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

const formatRatio = (ratio) => (ratio == null ? "—" : `${ratio.toFixed(2)}×`);

function SectionTitle({ title, detail }) {
  return (
    <div className="mb-3">
      <h3 className="font-display text-lg font-medium">{title}</h3>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

/** Finish rate among games you've decided on (Completed vs Abandoned) for each bucket. */
function finishRates(games, buckets, read) {
  return buckets.map(([label, test]) => {
    const inBucket = games.filter((game) => {
      const value = read(game);
      return value != null && test(value);
    });
    const completed = inBucket.filter(isFinished).length;
    const abandoned = inBucket.filter((game) => game.status === "Abandoned").length;
    const decided = completed + abandoned;
    return { label, total: inBucket.length, completed, abandoned, rate: decided ? (completed / decided) * 100 : null };
  });
}

/** Finish rate per genre, for genres with at least three decided games, most decided first. */
function genreFinishRates(games) {
  const genres = new Map();
  games.forEach((game) => (game.genres ?? []).forEach((genre) => genres.set(genre, [...(genres.get(genre) ?? []), game])));
  return [...genres.entries()]
    .map(([genre, items]) => finishRates(items, [[genre, () => true]], () => 0)[0])
    .filter((row) => row.completed + row.abandoned >= 3)
    .sort((a, b) => b.completed + b.abandoned - (a.completed + a.abandoned))
    .slice(0, 10);
}

function FinishRateChart({ rows }) {
  return (
    <ul className="space-y-3 rounded-card border border-border bg-card p-4">
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-sm sm:grid-cols-[7.5rem_1fr_3.5rem]">
          <span className="truncate text-muted-foreground" title={row.label}>{row.label}</span>
          <span className="flex h-2.5 overflow-hidden rounded-full bg-muted" title={`${row.completed} completed, ${row.abandoned} abandoned of ${row.total} games`}>
            {row.rate != null && (
              <>
                <span className="h-full bg-status-completed" style={{ width: `${row.rate}%` }} />
                <span className="h-full bg-status-abandoned/70" style={{ width: `${100 - row.rate}%` }} />
              </>
            )}
          </span>
          <span className="text-right tabular-nums">{row.rate == null ? "—" : `${Math.round(row.rate)}%`}</span>
          <span className="col-start-2 -mt-2 text-[11px] text-muted-foreground">
            {row.completed} finished · {row.abandoned} abandoned · {row.total} total
          </span>
        </li>
      ))}
    </ul>
  );
}

function GameLink({ game, className }) {
  const { openDetails } = useGameActions();
  const status = getStatusMeta(game.status);
  return (
    <button type="button" onClick={() => openDetails(game.appId)} className={cn("flex min-w-0 items-center gap-2 text-left text-sm hover:underline", className)}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", status.dotClass)} title={status.label} />
      <span className="truncate">{game.name}</span>
    </button>
  );
}

export function LibraryInsights({ games }) {
  const insights = useMemo(() => {
    // Your time = recorded Finished Hours, else Steam playtime.
    const paced = games
      .filter((game) => game.status === "Completed" && game.timeToBeatMainMinutes > 0)
      .map((game) => {
        const yourHours = game.finishedHours ?? game.playtimeForeverMinutes / 60;
        return { game, yourHours, ratio: yourHours / (game.timeToBeatMainMinutes / 60) };
      })
      .filter((item) => item.yourHours > 0)
      .sort((a, b) => b.ratio - a.ratio);
    const ratios = paced.map((item) => item.ratio);

    return {
      paced,
      averageRatio: ratios.length ? ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length : null,
      medianRatio: median(ratios),
      byLength: finishRates(games, LENGTH_BUCKETS, (game) => (game.timeToBeatMainMinutes == null ? null : game.timeToBeatMainMinutes / 60)),
      byScore: finishRates(games, SCORE_BUCKETS, (game) => game.reviewScore),
      byGenre: genreFinishRates(games),
      duplicates: findDuplicates(games),
    };
  }, [games]);

  const pace = insights.medianRatio;
  const paceSentence =
    pace == null
      ? "Complete a few games with an HLTB estimate to see how your pace compares."
      : pace > 1.1
        ? `You typically take ${formatRatio(pace)} the main-story estimate: you like to take your time.`
        : pace < 0.9
          ? `You typically finish in ${formatRatio(pace)} the main-story estimate: faster than most.`
          : "You typically finish right around the main-story estimate.";

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle title="You vs HowLongToBeat" detail="Completed games: your Finished Hours (or Steam hours if none recorded) against the HLTB main-story estimate." />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,18rem)_1fr]">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Typical pace</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-light tracking-tight">{formatRatio(pace)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Average {formatRatio(insights.averageRatio)} across {insights.paced.length} games
              </p>
              <p className="mt-3 text-sm text-muted-foreground">{paceSentence}</p>
            </CardContent>
          </Card>
          {insights.paced.length > 0 && (
            <ol className="max-h-72 divide-y divide-border overflow-y-auto rounded-card border border-border bg-card px-4">
              {insights.paced.map(({ game, yourHours, ratio }) => (
                <li key={game.appId} className="flex items-center justify-between gap-3 py-2">
                  <GameLink game={game} />
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatHours(yourHours * 60)} vs {formatHours(game.timeToBeatMainMinutes)} ·{" "}
                    <span className={ratio > 1 ? "text-status-problem" : "text-status-completed"}>{formatRatio(ratio)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle title="Finish rate by length" detail="Of the games you've completed or abandoned, how many you finished, by HLTB main-story length." />
          <FinishRateChart rows={insights.byLength} />
        </div>
        <div>
          <SectionTitle title="Finish rate by review score" detail="The same split by Steam review score. Do better-rated games hold you longer?" />
          <FinishRateChart rows={insights.byScore} />
        </div>
      </div>

      <div>
        <SectionTitle title="Finish rate by genre" detail="Genres with at least three games you've completed or abandoned. Genres come from Steam store data, which fills in over time." />
        {insights.byGenre.length ? (
          <FinishRateChart rows={insights.byGenre} />
        ) : (
          <p className="rounded-card border border-border bg-card p-4 text-sm text-muted-foreground">Not enough genre data yet.</p>
        )}
      </div>

      <div>
        <SectionTitle title="Possible duplicates" detail="Games that look like the same title in different editions (e.g. a remaster or GOTY edition)." />
        {insights.duplicates.length ? (
          <ul className="divide-y divide-border rounded-card border border-border bg-card px-4">
            {insights.duplicates.map((group) => (
              <li key={group.map((game) => game.appId).join("-")} className="flex flex-wrap gap-x-6 gap-y-1 py-2.5">
                {group.map((game) => (
                  <span key={game.appId} className="flex min-w-0 items-center gap-2">
                    <GameLink game={game} />
                    <span className="text-xs tabular-nums text-muted-foreground">{formatHours(game.playtimeForeverMinutes)}</span>
                  </span>
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-card border border-border bg-card p-4 text-sm text-muted-foreground">No likely duplicates found.</p>
        )}
      </div>
    </div>
  );
}
