// Fired when the server's password gate rejects a request, so the app can show the sign-in screen.
export const LOCKED_EVENT = "sift:locked";

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options,
  });

  if (response.status === 401 && !path.startsWith("/api/access")) {
    window.dispatchEvent(new Event(LOCKED_EVENT));
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

export const httpApi = {
  getAccessStatus: () => request("/api/access"),

  signIn: (password) => request("/api/access/sign-in", { method: "POST", body: JSON.stringify({ password }) }),

  signOut: () => request("/api/access/sign-out", { method: "POST" }),

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
