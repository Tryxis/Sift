import { daysSince, progressPercent } from "./gameMath";

// Granular filters. Each reads one number from a game; games with no value for an
// active filter (e.g. no review score yet) are hidden while that filter has a bound set.
export const FILTER_DEFINITIONS = [
  {
    id: "hours",
    label: "Hours played",
    unit: "hrs",
    read: (g) => g.playtimeForeverMinutes / 60,
  },
  {
    id: "recentHours",
    label: "Hours, last 2 weeks",
    unit: "hrs",
    read: (g) => (g.playtimeTwoWeeksMinutes ?? 0) / 60,
  },
  {
    id: "daysSincePlayed",
    label: "Days since played",
    unit: "days",
    read: (g) => daysSince(g.lastPlayedUtc),
  },
  {
    id: "timeToBeat",
    label: "Time to beat",
    unit: "hrs",
    read: (g) => (g.timeToBeatMainMinutes == null ? null : g.timeToBeatMainMinutes / 60),
  },
  {
    id: "progress",
    label: "Progress vs HLTB",
    unit: "%",
    read: (g) => progressPercent(g),
  },
  {
    id: "reviewScore",
    label: "Review score",
    unit: "%",
    read: (g) => g.reviewScore,
  },
  {
    id: "reviewCount",
    label: "Review count",
    unit: "reviews",
    read: (g) => g.reviewCount,
  },
  {
    id: "achievements",
    label: "Achievements",
    unit: "%",
    read: (g) => (g.achievementsTotal ? (g.achievementsUnlocked / g.achievementsTotal) * 100 : null),
  },
  {
    id: "releaseYear",
    label: "Release year",
    unit: "",
    read: (g) => g.releaseYear,
  },
  {
    id: "finishedHours",
    label: "Finished hours",
    unit: "hrs",
    read: (g) => g.finishedHours,
  },
];

export const FILTERS_BY_ID = Object.fromEntries(FILTER_DEFINITIONS.map((f) => [f.id, f]));

function parseBound(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function hasBound(bounds) {
  return parseBound(bounds.min) !== null || parseBound(bounds.max) !== null;
}

export function matchesFilters(game, activeFilters) {
  return Object.entries(activeFilters).every(([id, bounds]) => {
    const definition = FILTERS_BY_ID[id];
    if (!definition) return true;
    const min = parseBound(bounds.min);
    const max = parseBound(bounds.max);
    if (min === null && max === null) return true;
    const value = definition.read(game);
    if (value == null) return false;
    if (min !== null && value < min) return false;
    if (max !== null && value > max) return false;
    return true;
  });
}
