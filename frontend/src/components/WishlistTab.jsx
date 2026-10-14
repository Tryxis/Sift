import { useEffect, useMemo, useState } from "react";
import { Clock, ExternalLink, RefreshCw, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatHours, hoursLeftToBeat } from "@/lib/format";
import { cachedRequest } from "@/lib/remoteCache";
import { cn } from "@/lib/utils";
import { GameCover } from "./GameCover";

const SORTS = [
  ["rank", "Your wishlist order"],
  ["review", "Best reviewed"],
  ["short", "Shortest"],
  ["discount", "Biggest discount"],
];

function useWishlist(steamId) {
  const [state, setState] = useState({ items: null, error: null, isLoading: true });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, isLoading: true, error: null }));
    // Cache per session; "Refresh" bypasses it with a new key.
    cachedRequest(`wishlist:${steamId}:${reloadKey}`, () => api.getWishlist(steamId))
      .then((items) => !cancelled && setState({ items, error: null, isLoading: false }))
      .catch((error) => !cancelled && setState({ items: null, error, isLoading: false }));
    return () => {
      cancelled = true;
    };
  }, [steamId, reloadKey]);

  return { ...state, reload: () => setReloadKey((key) => key + 1) };
}

/**
 * HLTB estimates for wishlist items the server hasn't matched before, fetched two at a
 * time so a long wishlist doesn't flood the lookup service.
 */
function useTimesToBeat(items) {
  const [times, setTimes] = useState({});

  useEffect(() => {
    if (!items) return undefined;
    let cancelled = false;
    const pending = items.filter((item) => item.timeToBeatMainMinutes == null && !item.comingSoon);
    let index = 0;
    const worker = async () => {
      while (!cancelled && index < pending.length) {
        const item = pending[index++];
        try {
          const result = await cachedRequest(`ttb:${item.appId}`, () => api.getTimeToBeat(item.appId, item.name));
          if (!cancelled) setTimes((current) => ({ ...current, [item.appId]: result.mainMinutes ?? null }));
        } catch {
          if (!cancelled) setTimes((current) => ({ ...current, [item.appId]: null }));
        }
      }
    };
    Promise.all([worker(), worker()]);
    return () => {
      cancelled = true;
    };
  }, [items]);

  return times;
}

export function WishlistTab({ steamId, games }) {
  const { items, error, isLoading, reload } = useWishlist(steamId);
  const lookedUp = useTimesToBeat(items);
  const [sort, setSort] = useState("rank");

  const backlog = useMemo(() => {
    const unplayed = games.filter((game) => game.status === "Backlog" && game.playtimeForeverMinutes === 0).length;
    return { unplayed, ...hoursLeftToBeat(games) };
  }, [games]);

  const rows = useMemo(() => {
    if (!items) return [];
    const withTimes = items.map((item) => ({
      ...item,
      mainMinutes: item.timeToBeatMainMinutes ?? lookedUp[item.appId] ?? null,
      timeLoading: item.timeToBeatMainMinutes == null && !item.comingSoon && !(item.appId in lookedUp),
    }));
    const byNullsLast = (read, direction = 1) => (a, b) => {
      const left = read(a);
      const right = read(b);
      if (left == null) return right == null ? 0 : 1;
      if (right == null) return -1;
      return (left - right) * direction;
    };
    if (sort === "review") withTimes.sort(byNullsLast((item) => item.reviewScore, -1));
    if (sort === "short") withTimes.sort(byNullsLast((item) => item.mainMinutes));
    if (sort === "discount") withTimes.sort(byNullsLast((item) => item.discountPercent || null, -1));
    return withTimes;
  }, [items, lookedUp, sort]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Wishlist</h2>
          <p className="text-sm text-muted-foreground">
            Before you buy: you have <span className="text-foreground">{backlog.unplayed} unplayed</span> backlog games
            {backlog.gameCount ? <> and about <span className="text-foreground">{backlog.hours.toLocaleString()} hrs</span> of main stories left</> : null}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="wishlist-sort">Sort wishlist</label>
          <select
            id="wishlist-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="h-8 rounded-full border border-border-strong bg-abyss px-3 text-[13px]"
          >
            {SORTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <Button variant="ghost" size="icon" onClick={reload} disabled={isLoading} aria-label="Refresh wishlist">
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {isLoading && !items ? (
        <p className="rounded-card border border-border bg-card p-4 text-sm text-muted-foreground">Loading your wishlist…</p>
      ) : error ? (
        <p className="rounded-card border border-status-abandoned/40 bg-status-abandoned/10 p-4 text-sm">
          The wishlist couldn't be loaded: {error.message}
        </p>
      ) : !rows.length ? (
        <p className="rounded-card border border-border bg-card p-4 text-sm text-muted-foreground">
          This wishlist is empty or private. Wishlists follow the profile&apos;s Game details privacy setting on Steam.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
          {rows.map((item, index) => (
            <li key={item.appId} className="flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4">
              {sort === "rank" && <span className="hidden w-5 shrink-0 text-xs tabular-nums text-muted-foreground sm:block">{index + 1}</span>}
              <div className="w-24 shrink-0 overflow-hidden rounded-md sm:w-32">
                <GameCover appId={item.appId} name={item.name} src={item.headerImageUrl} className="rounded-none border-0" />
              </div>
              <div className="min-w-0 flex-1">
                <a
                  href={`https://store.steampowered.com/app/${item.appId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm font-medium hover:underline"
                >
                  <span className="truncate">{item.name}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                </a>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {item.comingSoon && <span className="rounded-full border border-status-problem/50 px-1.5 text-status-problem">Unreleased</span>}
                  {item.releaseDate && <span>{item.releaseDate}</span>}
                  {item.reviewScore != null && (
                    <span className="flex items-center gap-1 tabular-nums" title={`${item.reviewCount?.toLocaleString() ?? "?"} reviews`}>
                      <ThumbsUp className="h-3 w-3" aria-hidden="true" />
                      {Math.round(item.reviewScore)}%
                    </span>
                  )}
                  {!item.comingSoon && (
                    <span className="flex items-center gap-1 tabular-nums" title="HowLongToBeat main story">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {item.timeLoading ? "…" : item.mainMinutes == null ? "—" : formatHours(item.mainMinutes)}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right text-sm tabular-nums">
                {item.isFree ? (
                  "Free"
                ) : (
                  <>
                    {item.discountPercent > 0 && (
                      <span className="mr-1.5 rounded bg-status-completed/20 px-1.5 py-0.5 text-xs font-medium text-status-completed">-{item.discountPercent}%</span>
                    )}
                    {item.priceFormatted ?? <span className="text-muted-foreground">—</span>}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
