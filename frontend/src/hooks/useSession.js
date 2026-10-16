import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { isGuestMode, setGuestMode } from "@/lib/api";
import { SIGNED_OUT_EVENT, httpApi, steamSignInUrl } from "@/lib/httpApi";
import { DEMO_STEAM_ID } from "@/lib/mockApi";

const USER_KEY = "sift:user";

function rememberUser(steamId) {
  try {
    if (steamId) localStorage.setItem(USER_KEY, steamId);
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable; offline start just won't know who signed in */
  }
}

function recallUser() {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

/** Drops library responses the service worker kept for offline use, so the next person on this device can't read them. */
async function clearCachedApiResponses() {
  if (!("caches" in window)) return;
  for (const key of await caches.keys()) {
    const cache = await caches.open(key);
    for (const request of await cache.keys()) {
      if (new URL(request.url).pathname.startsWith("/api/")) await cache.delete(request);
    }
  }
}

const SIGNED_OUT = { status: "signedOut", steamId: null };
const GUEST = { status: "guest", steamId: DEMO_STEAM_ID };

/**
 * Who is using Sift. status: "checking" → "signedIn" | "signedOut" | "guest".
 * steamId is the library this user owns and can change: their own when signed in through Steam,
 * the demo library for a guest. If the check itself fails (offline), the last signed-in user is
 * assumed so the installed app still opens on cached data; the server still guards every request.
 */
export function useSession() {
  const [state, setState] = useState(() => (isGuestMode() ? GUEST : { status: "checking", steamId: null }));

  useEffect(() => {
    if (isGuestMode()) return undefined;
    let cancelled = false;
    httpApi
      .getSession()
      .then(({ signedIn, steamId }) => {
        if (cancelled) return;
        rememberUser(signedIn ? steamId : null);
        setState(signedIn ? { status: "signedIn", steamId } : SIGNED_OUT);
      })
      .catch(() => {
        if (cancelled) return;
        const steamId = recallUser();
        setState(steamId ? { status: "signedIn", steamId } : SIGNED_OUT);
      });

    const onSignedOut = () => {
      // A guest isn't signed in to begin with; the request's own error explains what happened.
      if (isGuestMode()) return;
      rememberUser(null);
      setState(SIGNED_OUT);
    };
    window.addEventListener(SIGNED_OUT_EVENT, onSignedOut);
    return () => {
      cancelled = true;
      window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut);
    };
  }, []);

  /** Steam sign-in is a full-page round trip through steamcommunity.com, back to this page. */
  const signIn = useCallback(() => {
    setGuestMode(false);
    const returnTo = new URL(window.location.href);
    returnTo.searchParams.delete("guest");
    returnTo.searchParams.delete("signin");
    window.location.assign(steamSignInUrl(`${returnTo.pathname}${returnTo.search}`));
  }, []);

  const continueAsGuest = useCallback(() => {
    setGuestMode(true);
    setState(GUEST);
  }, []);

  /** Ends this browser's session, or with `everywhere` every session the account has. */
  const signOut = useCallback(async ({ everywhere = false } = {}) => {
    try {
      await (everywhere ? httpApi.signOutEverywhere() : httpApi.signOut());
    } finally {
      rememberUser(null);
      await clearCachedApiResponses().catch(() => {});
      setState(SIGNED_OUT);
    }
  }, []);

  /** Leaves the demo; a reload starts clean (the demo's changes only live in memory). */
  const exitGuest = useCallback(() => {
    setGuestMode(false);
    window.location.replace("/");
  }, []);

  return { ...state, isGuest: state.status === "guest", signIn, continueAsGuest, signOut, exitGuest };
}

export const SessionContext = createContext(null);

export function useSessionContext() {
  return useContext(SessionContext);
}
