// Fired when the server says the session has ended (expired or signed out elsewhere),
// so the app can show the sign-in screen.
export const SIGNED_OUT_EVENT = "sift:signed-out";

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      // The server rejects state-changing requests without this header (CSRF defence).
      "X-Sift-Request": "1",
    },
    credentials: "same-origin",
  });

  if (response.status === 401 && !path.startsWith("/api/auth")) {
    window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const problem = await response.json();
      message = problem.detail || problem.title || message;
      if (problem.errors) message = Object.values(problem.errors).flat().join(" ");
    } catch {
      /* body wasn't ProblemDetails JSON; keep the generic message */
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.status === 204 ? null : response.json();
}

const profilePath = (steamId) => `/api/profiles/${encodeURIComponent(steamId)}`;

/** Where to send the browser to sign in through Steam; it comes back to `returnUrl` afterwards. */
export function steamSignInUrl(returnUrl = "/") {
  return `/api/auth/steam/sign-in?returnUrl=${encodeURIComponent(returnUrl)}`;
}

export const httpApi = {
  getSession: () => request("/api/auth/session"),

  signOut: () => request("/api/auth/sign-out", { method: "POST" }),

  signOutEverywhere: () => request("/api/auth/sign-out-everywhere", { method: "POST" }),

  syncProfile: (identifier) =>
    request("/api/profiles/sync", { method: "POST", body: JSON.stringify({ identifier }) }),

  getLibrary: (steamId) => request(`${profilePath(steamId)}/library`),

  updateBacklog: (steamId, appId, patch) =>
    request(`${profilePath(steamId)}/games/${appId}/backlog`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  getSavedViews: (steamId) => request(`${profilePath(steamId)}/saved-views`),

  createSavedView: (steamId, body) =>
    request(`${profilePath(steamId)}/saved-views`, { method: "POST", body: JSON.stringify(body) }),

  updateSavedView: (steamId, id, body) =>
    request(`${profilePath(steamId)}/saved-views/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  selectSavedView: (steamId, id) =>
    request(`${profilePath(steamId)}/saved-views/selection`, { method: "PUT", body: JSON.stringify({ id }) }),

  deleteSavedView: (steamId, id) => request(`${profilePath(steamId)}/saved-views/${id}`, { method: "DELETE" }),

  getAppDetails: (appId) => request(`/api/apps/${appId}/details`),

  getAchievements: (steamId, appId) => request(`${profilePath(steamId)}/games/${appId}/achievements`),

  getWishlist: (steamId) => request(`${profilePath(steamId)}/wishlist`),

  getHistory: (steamId) => request(`${profilePath(steamId)}/history`),

  getMonthlyPlaytime: (steamId, months = 24) => request(`${profilePath(steamId)}/playtime/monthly?months=${months}`),

  getTimeToBeat: (appId, name) => request(`/api/apps/${appId}/time-to-beat?name=${encodeURIComponent(name)}`),
};
