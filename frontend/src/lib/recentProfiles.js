import { useCallback, useEffect, useState } from "react";

// The profiles someone has looked up or compared with lately, newest first. Kept on this device
// only: it's a convenience, unlike favourites, which are saved to the account.
const MAX_RECENT = 8;
const KEY = (ownerSteamId) => `sift:recent-profiles:${ownerSteamId}`;
const CHANGED_EVENT = "sift:recent-profiles-changed";

function read(ownerSteamId) {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY(ownerSteamId)) ?? "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function write(ownerSteamId, list) {
  try {
    localStorage.setItem(KEY(ownerSteamId), JSON.stringify(list));
  } catch {
    /* storage unavailable; recents just won't be remembered */
  }
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

/** Records a profile someone looked at. Their own profile isn't recorded. */
export function recordRecentProfile(ownerSteamId, profile) {
  if (!ownerSteamId || !profile?.steamId || profile.steamId === ownerSteamId) return;
  const entry = {
    steamId: profile.steamId,
    personaName: profile.personaName,
    avatarUrl: profile.avatarUrl ?? null,
    viewedUtc: new Date().toISOString(),
  };
  write(ownerSteamId, [entry, ...read(ownerSteamId).filter((item) => item.steamId !== profile.steamId)].slice(0, MAX_RECENT));
}

export function useRecentProfiles(ownerSteamId) {
  const [recent, setRecent] = useState(() => (ownerSteamId ? read(ownerSteamId) : []));

  useEffect(() => {
    if (!ownerSteamId) return undefined;
    const update = () => setRecent(read(ownerSteamId));
    update();
    window.addEventListener(CHANGED_EVENT, update);
    return () => window.removeEventListener(CHANGED_EVENT, update);
  }, [ownerSteamId]);

  const forget = useCallback((steamId) => write(ownerSteamId, read(ownerSteamId).filter((item) => item.steamId !== steamId)), [ownerSteamId]);

  return { recent, forget };
}
