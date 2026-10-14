import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const LAST_PROFILE_KEY = "sift:lastProfile";

// Remembered in the URL (shareable, survives refresh) and in localStorage
// (so the home-screen app, which always opens at "/", reopens on your library).
function rememberProfile(steamId) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("profile", steamId);
    window.history.replaceState(null, "", url);
  } catch {
    /* sandboxed environments may block history; not essential */
  }
  try {
    localStorage.setItem(LAST_PROFILE_KEY, steamId);
  } catch {
    /* storage unavailable (private mode); not essential */
  }
}

function recallProfile() {
  const fromUrl = new URLSearchParams(window.location.search).get("profile");
  if (fromUrl) return fromUrl;
  try {
    return localStorage.getItem(LAST_PROFILE_KEY);
  } catch {
    return null;
  }
}

function replaceGame(library, appId, next) {
  return { ...library, games: library.games.map((g) => (g.appId === appId ? next(g) : g)) };
}

const STALE_AFTER_MS = 12 * 60 * 60 * 1000;
const NEW_FOR_MS = 7 * 24 * 60 * 60 * 1000;
const seenKey = (steamId) => `sift:seen:${steamId}`;

/**
 * Tracks when each game was first seen on this device. The first visit is a baseline
 * (nothing is "new"); games that appear in later syncs are new for a week.
 */
function trackNewGames(library) {
  const now = Date.now();
  try {
    const key = seenKey(library.profile.steamId);
    const stored = JSON.parse(localStorage.getItem(key) ?? "null");
    const seen = stored ?? {};
    let changed = !stored;
    library.games.forEach((game) => {
      if (!(game.appId in seen)) {
        seen[game.appId] = stored ? now : 0;
        changed = true;
      }
    });
    if (changed) localStorage.setItem(key, JSON.stringify(seen));
    return new Set(library.games.filter((game) => now - seen[game.appId] < NEW_FOR_MS).map((game) => game.appId));
  } catch {
    return new Set();
  }
}

/** Optimistic copy of a game with a backlog patch applied. */
export function applyPatch(game, patch) {
  const next = { ...game, ...patch };
  if (patch.clearFinishedHours) next.finishedHours = null;
  if (patch.priority === 0) next.priority = null;
  if (patch.notes === "") next.notes = null;
  delete next.clearFinishedHours;
  return next;
}

/** The patch that puts back whatever `patch` is about to change. */
export function inversePatch(previous, patch) {
  const inverse = {};
  Object.keys(patch).forEach((key) => {
    if (key === "finishedHours" || key === "clearFinishedHours") {
      if (previous.finishedHours == null) inverse.clearFinishedHours = true;
      else inverse.finishedHours = previous.finishedHours;
    } else if (key === "priority") inverse.priority = previous.priority ?? 0;
    else if (key === "notes") inverse.notes = previous.notes ?? "";
    else inverse[key] = previous[key];
  });
  return inverse;
}

async function runWithConcurrency(items, limit, worker) {
  const results = [];
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current]);
    }
  });
  await Promise.all(runners);
  return results;
}

export function useLibrary() {
  const [library, setLibraryState] = useState(null);
  const [newAppIds, setNewAppIds] = useState(() => new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);

  const setLibrary = useCallback((next) => {
    setLibraryState(next);
    if (next) setNewAppIds(trackNewGames(next));
  }, []);

  const lookUp = useCallback(async (identifier) => {
    setIsSyncing(true);
    setError(null);
    try {
      const result = await api.syncProfile(identifier);
      setLibrary(result);
      rememberProfile(result.profile.steamId);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSyncing(false);
    }
  }, [setLibrary]);

  // Reopening the app shows the last profile straight away from the stored copy, then
  // refreshes from Steam in the background if that copy is more than 12 hours old.
  useEffect(() => {
    const steamId = recallProfile();
    if (!steamId) return;
    api
      .getLibrary(steamId)
      .then((stored) => {
        setLibrary(stored);
        const age = Date.now() - Date.parse(stored.profile.lastSyncedUtc ?? 0);
        if (navigator.onLine !== false && !(age < STALE_AFTER_MS)) lookUp(steamId);
      })
      .catch((e) => (e.status === 404 ? lookUp(steamId) : setError(e.message)));
  }, [lookUp, setLibrary]);

  useEffect(() => {
    const update = () => setIsOffline(navigator.onLine === false);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const resync = useCallback(() => {
    if (library) lookUp(library.profile.steamId);
  }, [library, lookUp]);

  // Read through a ref so the update callbacks keep a stable identity and don't re-render every card.
  const libraryRef = useRef(library);
  libraryRef.current = library;

  /**
   * Optimistic batch update: every game changes instantly, saves run a few at a time, and
   * each failure rolls back only if nothing else has changed that game since.
   * Resolves to the number of saves that failed.
   */
  const updateGames = useCallback(async (changes) => {
    const current = libraryRef.current;
    if (!current || !changes.length) return 0;
    const { steamId } = current.profile;
    const byId = new Map(current.games.map((game) => [game.appId, game]));
    const planned = changes
      .filter(({ appId }) => byId.has(appId))
      .map(({ appId, patch }) => ({ appId, patch, previous: byId.get(appId), optimistic: applyPatch(byId.get(appId), patch) }));
    const optimisticById = new Map(planned.map((item) => [item.appId, item.optimistic]));

    setLibraryState((lib) => ({
      ...lib,
      games: lib.games.map((game) => optimisticById.get(game.appId) ?? game),
    }));

    const outcomes = await runWithConcurrency(planned, 4, async (item) => {
      try {
        const saved = await api.updateBacklog(steamId, item.appId, item.patch);
        setLibraryState((lib) => (lib?.profile.steamId === steamId ? replaceGame(lib, item.appId, () => saved) : lib));
        return null;
      } catch (e) {
        setLibraryState((lib) =>
          lib?.profile.steamId === steamId
            ? replaceGame(lib, item.appId, (game) => (game === item.optimistic ? item.previous : game))
            : lib
        );
        return e;
      }
    });

    const failures = outcomes.filter(Boolean);
    if (failures.length) {
      setError(
        failures.length === 1
          ? `Game update not saved: ${failures[0].message}`
          : `${failures.length} game updates weren't saved: ${failures[0].message}`
      );
    }
    return failures.length;
  }, []);

  const updateGame = useCallback((appId, patch) => updateGames([{ appId, patch }]), [updateGames]);

  const dismissError = useCallback(() => setError(null), []);

  return { library, newAppIds, isSyncing, isOffline, error, dismissError, lookUp, resync, updateGame, updateGames };
}
