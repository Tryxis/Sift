import { useCallback, useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/api";

// One shared copy per signed-in user, so starring someone in Compare shows their notes in the
// details panel straight away. `version` changes on every edit; notes requests are keyed on it.
const stores = new Map();

function storeFor(ownerSteamId) {
  if (!stores.has(ownerSteamId)) {
    stores.set(ownerSteamId, { state: { favourites: [], isLoaded: false, version: 0 }, listeners: new Set(), loading: null });
  }
  return stores.get(ownerSteamId);
}

function setState(store, next) {
  store.state = { ...store.state, ...next, version: store.state.version + 1 };
  store.listeners.forEach((listener) => listener());
}

function load(ownerSteamId) {
  const store = storeFor(ownerSteamId);
  if (!store.loading) {
    store.loading = api.getFavourites(ownerSteamId)
      .then((favourites) => setState(store, { favourites, isLoaded: true }))
      .catch(() => {
        // Not essential: Sift works without them. Try again next time something asks.
        store.loading = null;
        setState(store, { isLoaded: true });
      });
  }
  return store.loading;
}

const EMPTY = { favourites: [], isLoaded: false, version: 0 };

/** The name to show for a profile: your alias for them, else their Steam name. */
export function displayName(profile, favourite) {
  return favourite?.alias || profile?.personaName || favourite?.personaName || "Unknown";
}

/**
 * The signed-in user's favourite profiles. `save` adds one or changes its alias; `remove` drops it.
 * Both update the list straight away and resolve once the server agrees (rejecting if it doesn't,
 * with the list put back).
 */
export function useFavourites(ownerSteamId) {
  const subscribe = useCallback((listener) => {
    if (!ownerSteamId) return () => {};
    const store = storeFor(ownerSteamId);
    store.listeners.add(listener);
    return () => store.listeners.delete(listener);
  }, [ownerSteamId]);
  const state = useSyncExternalStore(subscribe, () => (ownerSteamId ? storeFor(ownerSteamId).state : EMPTY));

  useEffect(() => {
    if (ownerSteamId) load(ownerSteamId);
  }, [ownerSteamId]);

  const save = useCallback(async (profile, alias) => {
    const store = storeFor(ownerSteamId);
    const previous = store.state.favourites;
    const existing = previous.find((item) => item.steamId === profile.steamId);
    const { steamId, personaName, avatarUrl } = profile;
    const optimistic = { addedUtc: new Date().toISOString(), ...existing, steamId, personaName, avatarUrl, alias: alias?.trim() || null };
    setState(store, { favourites: [...previous.filter((item) => item.steamId !== profile.steamId), optimistic] });
    try {
      const saved = await api.saveFavourite(ownerSteamId, profile.steamId, alias?.trim() || null);
      const merged = { ...saved, personaName: saved.personaName || optimistic.personaName, avatarUrl: saved.avatarUrl ?? optimistic.avatarUrl };
      setState(store, { favourites: store.state.favourites.map((item) => (item.steamId === merged.steamId ? merged : item)) });
      return merged;
    } catch (error) {
      setState(store, { favourites: previous });
      throw error;
    }
  }, [ownerSteamId]);

  const remove = useCallback(async (steamId) => {
    const store = storeFor(ownerSteamId);
    const previous = store.state.favourites;
    setState(store, { favourites: previous.filter((item) => item.steamId !== steamId) });
    try {
      await api.deleteFavourite(ownerSteamId, steamId);
    } catch (error) {
      setState(store, { favourites: previous });
      throw error;
    }
  }, [ownerSteamId]);

  const find = useCallback((steamId) => state.favourites.find((item) => item.steamId === steamId), [state.favourites]);

  return { ...state, find, save, remove };
}
