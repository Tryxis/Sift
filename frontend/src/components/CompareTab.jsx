import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatHours } from "@/lib/format";
import { cachedRequest } from "@/lib/remoteCache";
import { getStatusMeta, isCountable, isFinished } from "@/lib/status";
import { cn } from "@/lib/utils";
import { ProfileSearch } from "./ProfileSearch";
import { useGameActions } from "./GameActions";

const LAST_COMPARED_KEY = (steamId) => `sift:compare:${steamId}`;
const LOVED_MINUTES = 10 * 60;

function readLastCompared(steamId) {
  try {
    return localStorage.getItem(LAST_COMPARED_KEY(steamId));
  } catch {
    return null;
  }
}

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

function ListSection({ title, detail, empty, children, count }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
      </div>
      {count ? (
        <ol className="max-h-[28rem] divide-y divide-border overflow-y-auto rounded-card border border-border bg-card px-4">{children}</ol>
      ) : (
        <p className="rounded-card border border-border bg-card p-4 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function MyGameName({ game }) {
  const { openDetails } = useGameActions();
  const status = getStatusMeta(game.status);
  return (
    <button type="button" onClick={() => openDetails(game.appId)} className="flex min-w-0 items-center gap-2 text-left text-sm hover:underline">
      <span className={cn("h-2 w-2 shrink-0 rounded-full", status.dotClass)} title={`You: ${status.label}`} />
      <span className="truncate">{game.name}</span>
    </button>
  );
}

function HoursPair({ mine, theirs, max }) {
  return (
    <div className="mt-1 grid gap-1 text-[11px] tabular-nums text-muted-foreground">
      {[
        ["You", mine, "bg-status-playing"],
        ["Them", theirs, "bg-status-completed"],
      ].map(([label, minutes, color]) => (
        <div key={label} className="grid grid-cols-[2.5rem_1fr_4.5rem] items-center gap-2">
          <span>{label}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-muted">
            <span className={cn("block h-full rounded-full", color)} style={{ width: `${(minutes / max) * 100}%` }} />
          </span>
          <span className="text-right">{formatHours(minutes)}</span>
        </div>
      ))}
    </div>
  );
}

export function CompareTab({ profile, games }) {
  const [identifier, setIdentifier] = useState(() => readLastCompared(profile.steamId));
  const [state, setState] = useState({ friend: null, error: null, isLoading: false });

  useEffect(() => {
    if (!identifier) return undefined;
    let cancelled = false;
    setState({ friend: null, error: null, isLoading: true });
    // Syncing pulls their current library from Steam; it needs public game details.
    cachedRequest(`compare:${identifier}`, () => api.syncProfile(identifier))
      .then((friend) => {
        if (cancelled) return;
        setState({ friend, error: null, isLoading: false });
        try {
          localStorage.setItem(LAST_COMPARED_KEY(profile.steamId), identifier);
        } catch {
          /* not essential */
        }
      })
      .catch((error) => !cancelled && setState({ friend: null, error, isLoading: false }));
    return () => {
      cancelled = true;
    };
  }, [identifier, profile.steamId]);

  const comparison = useMemo(() => {
    const friend = state.friend;
    if (!friend) return null;
    const friendGames = friend.games.filter(isCountable);
    const theirs = new Map(friendGames.map((game) => [game.appId, game]));
    const mine = new Set(games.map((game) => game.appId));
    const common = games.filter((game) => theirs.has(game.appId)).map((game) => ({ mine: game, theirs: theirs.get(game.appId) }));
    const usesSift = friendGames.some((game) => game.status !== "Backlog");
    const mostPlayed = common
      .filter(({ mine: m, theirs: t }) => m.playtimeForeverMinutes > 0 && t.playtimeForeverMinutes > 0)
      .sort((a, b) => b.mine.playtimeForeverMinutes + b.theirs.playtimeForeverMinutes - (a.mine.playtimeForeverMinutes + a.theirs.playtimeForeverMinutes))
      .slice(0, 25);
    return {
      friend,
      common,
      mostPlayed,
      mostPlayedMax: Math.max(1, ...mostPlayed.flatMap(({ mine: m, theirs: t }) => [m.playtimeForeverMinutes, t.playtimeForeverMinutes])),
      onlyTheirs: friendGames.filter((game) => !mine.has(game.appId)).sort((a, b) => b.playtimeForeverMinutes - a.playtimeForeverMinutes),
      theirHours: Math.round(friendGames.reduce((sum, game) => sum + game.playtimeForeverMinutes, 0) / 60),
      lovedUnstarted: common
        .filter(({ mine: m, theirs: t }) => m.playtimeForeverMinutes === 0 && (t.playtimeForeverMinutes >= LOVED_MINUTES || isFinished(t)))
        .sort((a, b) => b.theirs.playtimeForeverMinutes - a.theirs.playtimeForeverMinutes),
      usesSift,
      theyFinished: usesSift
        ? common.filter(({ mine: m, theirs: t }) => isFinished(t) && !isFinished(m))
        : [],
    };
  }, [state.friend, games]);

  const isSelf = comparison?.friend.profile.steamId === profile.steamId;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Compare with a friend</h2>
        <p className="text-sm text-muted-foreground">See what you both own, what they rate that you haven&apos;t started, and where your hours overlap.</p>
        <ProfileSearch onSubmit={setIdentifier} isBusy={state.isLoading} className="mt-3 max-w-lg" placeholder="Friend's profile link, custom URL or SteamID64" buttonLabel="Compare" />
      </div>

      {state.isLoading && <p className="text-sm text-muted-foreground">Fetching their library from Steam…</p>}
      {state.error && (
        <p className="rounded-card border border-status-abandoned/40 bg-status-abandoned/10 p-4 text-sm">
          Couldn&apos;t compare: {state.error.message}
        </p>
      )}

      {comparison && isSelf && (
        <p className="rounded-card border border-border bg-card p-4 text-sm text-muted-foreground">That&apos;s your own profile. Try a friend&apos;s instead.</p>
      )}

      {comparison && !isSelf && (
        <>
          <div className="flex items-center gap-3">
            {comparison.friend.profile.avatarUrl ? (
              <img src={comparison.friend.profile.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full border border-border-strong" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-strong bg-muted">
                <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{comparison.friend.profile.personaName}</p>
              <p className="text-xs text-muted-foreground">
                {comparison.friend.profile.isLibraryVisible ? `${comparison.friend.games.filter(isCountable).length.toLocaleString()} games` : "Game details are private"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile title="In common" value={comparison.common.length} detail={`${Math.round((comparison.common.length / Math.max(games.length, 1)) * 100)}% of your library`} />
            <Tile title="Only they own" value={comparison.onlyTheirs.length} />
            <Tile title="Their hours" value={comparison.theirHours.toLocaleString()} />
            <Tile title="They rate, you haven't started" value={comparison.lovedUnstarted.length} detail="10+ hrs or finished by them" />
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <ListSection
              title="They rate it, you haven't started"
              detail="Games you both own where they've put in 10+ hours or finished it, and you haven't launched it."
              empty="Nothing here: you've started everything they've sunk time into."
              count={comparison.lovedUnstarted.length}
            >
              {comparison.lovedUnstarted.map(({ mine, theirs }) => (
                <li key={mine.appId} className="flex items-center justify-between gap-3 py-2">
                  <MyGameName game={mine} />
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {isFinished(theirs) ? "Finished · " : ""}
                    {formatHours(theirs.playtimeForeverMinutes)}
                  </span>
                </li>
              ))}
            </ListSection>

            <ListSection
              title="Most played in common"
              detail="Games you've both spent time in."
              empty="You haven't both played any of the same games yet."
              count={comparison.mostPlayed.length}
            >
              {comparison.mostPlayed.map(({ mine, theirs }) => (
                <li key={mine.appId} className="py-2">
                  <MyGameName game={mine} />
                  <HoursPair
                    mine={mine.playtimeForeverMinutes}
                    theirs={theirs.playtimeForeverMinutes}
                    max={comparison.mostPlayedMax}
                  />
                </li>
              ))}
            </ListSection>

            {comparison.usesSift && (
              <ListSection
                title="They finished, you haven't"
                detail="From their Sift statuses."
                empty="Nothing they've finished is unfinished for you."
                count={comparison.theyFinished.length}
              >
                {comparison.theyFinished.map(({ mine }) => (
                  <li key={mine.appId} className="py-2">
                    <MyGameName game={mine} />
                  </li>
                ))}
              </ListSection>
            )}

            <ListSection
              title="Only they own"
              detail="Their most played games that aren't in your library."
              empty="You own everything they do."
              count={comparison.onlyTheirs.length}
            >
              {comparison.onlyTheirs.slice(0, 40).map((game) => (
                <li key={game.appId} className="flex items-center justify-between gap-3 py-2">
                  <a href={`https://store.steampowered.com/app/${game.appId}`} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-1.5 text-sm hover:underline">
                    <span className="truncate">{game.name}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </a>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatHours(game.playtimeForeverMinutes)}</span>
                </li>
              ))}
            </ListSection>
          </div>
        </>
      )}
    </div>
  );
}
