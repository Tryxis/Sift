import { useCallback, useEffect, useState } from "react";
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

export function useLibrary() {
  const [library, setLibrary] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);

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
  }, []);

  // Reopening the app shows the last profile: read the stored copy, sync if we've never seen it.
  useEffect(() => {
    const steamId = recallProfile();
    if (!steamId) return;
    api
      .getLibrary(steamId)
      .then(setLibrary)
      .catch((e) => (e.status === 404 ? lookUp(steamId) : setError(e.message)));
  }, [lookUp]);

  const resync = useCallback(() => {
    if (library) lookUp(library.profile.steamId);
  }, [library, lookUp]);

  // Optimistic: the card updates instantly, and rolls back if the save fails.
  const updateGame = useCallback(
    async (appId, patch) => {
      if (!library) return;
      const { steamId } = library.profile;
      const previous = library.games.find((g) => g.appId === appId);

      setLibrary((current) => replaceGame(current, appId, (g) => ({ ...g, ...patch })));
      try {
        const saved = await api.updateBacklog(steamId, appId, patch);
        setLibrary((current) => replaceGame(current, appId, () => saved));
      } catch (e) {
        setLibrary((current) => replaceGame(current, appId, () => previous));
        setError(`Game update not saved: ${e.message}`);
      }
    },
    [library]
  );

  return { library, isSyncing, error, dismissError: () => setError(null), lookUp, resync, updateGame };
}
