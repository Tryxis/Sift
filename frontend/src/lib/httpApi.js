async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

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

  return response.json();
}

export const httpApi = {
  syncProfile: (identifier) =>
    request("/api/profiles/sync", { method: "POST", body: JSON.stringify({ identifier }) }),

  getLibrary: (steamId) => request(`/api/profiles/${encodeURIComponent(steamId)}/library`),

  updateBacklog: (steamId, appId, patch) =>
    request(`/api/profiles/${encodeURIComponent(steamId)}/games/${appId}/backlog`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
};
