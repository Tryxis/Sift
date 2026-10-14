import { useEffect, useState } from "react";

// Lookups that don't change within a session (store details, achievements, HLTB for
// wishlist items) are cached in memory so reopening a panel is instant.
const cache = new Map();

export function cachedRequest(key, loader) {
  if (!cache.has(key)) {
    const promise = loader().catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, promise);
  }
  return cache.get(key);
}

/** { data, error, isLoading } for a cached request; pass a null key to skip. */
export function useCachedRequest(key, loader) {
  const [state, setState] = useState({ data: null, error: null, isLoading: Boolean(key) });

  useEffect(() => {
    if (!key) {
      setState({ data: null, error: null, isLoading: false });
      return undefined;
    }
    let cancelled = false;
    setState((current) => ({ ...current, isLoading: true, error: null }));
    cachedRequest(key, loader)
      .then((data) => !cancelled && setState({ data, error: null, isLoading: false }))
      .catch((error) => !cancelled && setState({ data: null, error, isLoading: false }));
    return () => {
      cancelled = true;
    };
    // The loader is tied to the key; re-running on every new function identity would refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
