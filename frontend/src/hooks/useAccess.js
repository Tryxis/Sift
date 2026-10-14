import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LOCKED_EVENT } from "@/lib/httpApi";

/**
 * The hosted copy can sit behind a shared password (server setting Access:Password).
 * status: "checking" → "locked" | "open". If the check itself fails (e.g. offline), the
 * app opens anyway so cached data stays viewable; the server still guards every request.
 */
export function useAccess() {
  const [state, setState] = useState({ status: "checking", required: false });

  useEffect(() => {
    let cancelled = false;
    api
      .getAccessStatus()
      .then(({ required, signedIn }) => !cancelled && setState({ status: signedIn ? "open" : "locked", required }))
      .catch(() => !cancelled && setState({ status: "open", required: false }));

    const lock = () => setState({ status: "locked", required: true });
    window.addEventListener(LOCKED_EVENT, lock);
    return () => {
      cancelled = true;
      window.removeEventListener(LOCKED_EVENT, lock);
    };
  }, []);

  /** Resolves to an error message, or null when signed in. */
  const signIn = useCallback(async (password) => {
    try {
      await api.signIn(password);
      setState({ status: "open", required: true });
      return null;
    } catch (e) {
      return e.status === 429 ? "Too many attempts. Wait a few minutes and try again." : e.status === 401 ? "That password isn't right." : e.message;
    }
  }, []);

  const lock = useCallback(async () => {
    try {
      await api.signOut();
    } finally {
      setState({ status: "locked", required: true });
    }
  }, []);

  return { ...state, signIn, lock };
}

export const AccessContext = createContext({ required: false, lock: () => {} });

export function useAccessControls() {
  return useContext(AccessContext);
}
