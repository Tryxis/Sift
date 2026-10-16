import { httpApi } from "./httpApi";
import { DEMO_STEAM_ID, isDemoIdentifier, mockApi } from "./mockApi";

/** Builds with no server (`dev:mock`, `build:preview`) only ever run the guest demo. */
export const USING_MOCK_API = import.meta.env.VITE_USE_MOCK === "true";

const GUEST_KEY = "sift:guest";

// Guest mode (e.g. a portfolio link to /?guest) opens on a seeded demo library that lives in the
// browser, so a visitor can try every feature without changing anything real. Any other profile
// they look up comes from the server, read-only. It lasts for the tab.
function readGuestMode() {
  if (USING_MOCK_API) return true;
  try {
    if (new URLSearchParams(window.location.search).has("guest")) {
      sessionStorage.setItem(GUEST_KEY, "1");
      return true;
    }
    return sessionStorage.getItem(GUEST_KEY) === "1";
  } catch {
    return false;
  }
}

let guestMode = readGuestMode();

export function isGuestMode() {
  return guestMode;
}

export function setGuestMode(on) {
  guestMode = USING_MOCK_API || on;
  try {
    if (guestMode) sessionStorage.setItem(GUEST_KEY, "1");
    else sessionStorage.removeItem(GUEST_KEY);
  } catch {
    /* storage unavailable; guest mode just won't survive a reload */
  }
}

// Calls whose first argument is the profile they're about.
const PROFILE_CALLS = new Set([
  "getLibrary", "updateBacklog", "getSavedViews", "createSavedView", "updateSavedView", "selectSavedView",
  "deleteSavedView", "getAchievements", "getWishlist", "getHistory", "getMonthlyPlaytime",
]);

function backendFor(name, args) {
  if (!guestMode) return httpApi;
  if (USING_MOCK_API) return mockApi; // no server: every profile is a made-up sample
  if (name === "syncProfile") return isDemoIdentifier(args[0]) ? mockApi : httpApi;
  if (PROFILE_CALLS.has(name)) return args[0] === DEMO_STEAM_ID ? mockApi : httpApi;
  return httpApi; // store details and HowLongToBeat times are real for every game
}

/** Library data calls. Guests' demo library is answered in the browser; everything else by the server. */
export const api = new Proxy({}, {
  get: (_, name) => (...args) => backendFor(name, args)[name](...args),
});
