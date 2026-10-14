import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatHours, formatRelativeTime } from "@/lib/format";
import { daysSince } from "@/lib/gameMath";
import { getStatusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";
import { useGameActions } from "./GameActions";

const STALLED_AFTER_DAYS = 60;

function Tile({ title, value, detail }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-1.5 sm:p-5 sm:pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
        <p className="font-display text-2xl font-light tracking-tight sm:text-3xl">{value}</p>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );
}

function SectionHeading({ title, detail }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
    </div>
  );
}

function GameName({ game }) {
  const { openDetails } = useGameActions();
  const status = getStatusMeta(game.status, game.playedBefore);
  return (
    <button type="button" onClick={() => openDetails(game.appId)} className="flex min-w-0 items-center gap-2 text-left text-sm hover:underline">
      <span className={cn("h-2 w-2 shrink-0 rounded-full", status.dotClass)} title={status.label} />
      <span className="truncate">{game.name}</span>
    </button>
  );
}

export function ActivityTab({ games }) {
  const { updateGame } = useGameActions();

  const activity = useMemo(() => {
    const recent = games.filter((game) => game.playtimeTwoWeeksMinutes > 0).sort((a, b) => b.playtimeTwoWeeksMinutes - a.playtimeTwoWeeksMinutes);
    const byLastPlayed = games.filter((game) => game.lastPlayedUtc).sort((a, b) => Date.parse(b.lastPlayedUtc) - Date.parse(a.lastPlayedUtc));
    const stalled = games
      .filter((game) => game.status === "Playing" && (daysSince(game.lastPlayedUtc) ?? Infinity) >= STALLED_AFTER_DAYS)
      .sort((a, b) => (daysSince(b.lastPlayedUtc) ?? Infinity) - (daysSince(a.lastPlayedUtc) ?? Infinity));
    return {
      recent,
      recentMinutes: recent.reduce((sum, game) => sum + game.playtimeTwoWeeksMinutes, 0),
      playedThisMonth: byLastPlayed.filter((game) => daysSince(game.lastPlayedUtc) <= 30).length,
      lastPlayed: byLastPlayed[0] ?? null,
      timeline: byLastPlayed.slice(0, 12),
      stalled,
    };
  }, [games]);

  const topRecent = activity.recent[0]?.playtimeTwoWeeksMinutes ?? 1;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile title="Last 2 weeks" value={formatHours(activity.recentMinutes).replace("Unplayed", "0 hrs")} detail={`Across ${activity.recent.length} games`} />
        <Tile title="Played in 30 days" value={activity.playedThisMonth} detail="Games launched" />
        <Tile
          title="Last session"
          value={activity.lastPlayed ? formatRelativeTime(activity.lastPlayed.lastPlayedUtc) : "—"}
          detail={activity.lastPlayed?.name}
        />
        <Tile title="Stalled" value={activity.stalled.length} detail={`Playing, idle ${STALLED_AFTER_DAYS}+ days`} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionHeading title="Last two weeks" detail="Hours per game over the past 14 days, from Steam." />
          {activity.recent.length ? (
            <ol className="space-y-3 rounded-card border border-border bg-card p-4">
              {activity.recent.map((game) => (
                <li key={game.appId} className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <GameName game={game} />
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatHours(game.playtimeTwoWeeksMinutes)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-status-playing" style={{ width: `${(game.playtimeTwoWeeksMinutes / topRecent) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-card border border-border bg-card p-4 text-sm text-muted-foreground">Nothing played in the last two weeks.</p>
          )}
        </section>

        <section>
          <SectionHeading title="Recently played" detail="The last games you launched." />
          <ol className="divide-y divide-border rounded-card border border-border bg-card px-4">
            {activity.timeline.map((game) => (
              <li key={game.appId} className="flex items-center justify-between gap-3 py-2">
                <GameName game={game} />
                <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(game.lastPlayedUtc)}</span>
              </li>
            ))}
            {!activity.timeline.length && <li className="py-4 text-sm text-muted-foreground">No play history yet.</li>}
          </ol>
        </section>
      </div>

      <section>
        <SectionHeading
          title="Stalled"
          detail={`Marked Playing, but not launched for ${STALLED_AFTER_DAYS}+ days. Be honest with yourself.`}
        />
        {activity.stalled.length ? (
          <ul className="divide-y divide-border rounded-card border border-border bg-card px-4">
            {activity.stalled.map((game) => (
              <li key={game.appId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <GameName game={game} />
                  <p className="mt-0.5 pl-4 text-xs text-muted-foreground">
                    {game.lastPlayedUtc ? `Last played ${formatRelativeTime(game.lastPlayedUtc)}` : "Never launched"} · {formatHours(game.playtimeForeverMinutes)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => updateGame(game.appId, { status: "Backlog" })}>
                    Back to backlog
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title={game.finishedHours == null ? "Also records current Steam hours as Finished Hours" : undefined}
                    onClick={() =>
                      updateGame(game.appId, {
                        status: "Abandoned",
                        ...(game.finishedHours == null && { finishedHours: Number((game.playtimeForeverMinutes / 60).toFixed(2)) }),
                      })
                    }
                  >
                    Abandon
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-card border border-border bg-card p-4 text-sm text-muted-foreground">Nothing stalled. Everything marked Playing has been played recently.</p>
        )}
      </section>
    </div>
  );
}
