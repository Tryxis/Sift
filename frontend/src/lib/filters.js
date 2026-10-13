// Granular filters. Each reads one number from a game; games with no value for an
// active filter (e.g. no review score yet) are hidden while that filter has a bound set.
export const FILTER_DEFINITIONS = [
  {
    id: "hours",
    label: "Hours played",
    fields: ["min", "max"],
    unit: "hrs",
    read: (g) => g.playtimeForeverMinutes / 60,
  },
  {
    id: "timeToBeat",
    label: "Time to beat",
    fields: ["min", "max"],
    unit: "hrs",
    read: (g) => (g.timeToBeatMainMinutes == null ? null : g.timeToBeatMainMinutes / 60),
  },
  {
    id: "reviewScore",
    label: "Review score",
    fields: ["min", "max"],
    unit: "%",
    read: (g) => g.reviewScore,
  },
  {
    id: "finishedHours",
    label: "Finished hours",
    fields: ["min", "max"],
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

export function matchesFilters(game, activeFilters) {
  return Object.entries(activeFilters).every(([id, bounds]) => {
    const min = parseBound(bounds.min);
    const max = parseBound(bounds.max);
    if (min === null && max === null) return true;
    const value = FILTERS_BY_ID[id].read(game);
    if (value == null) return false;
    if (min !== null && value < min) return false;
    if (max !== null && value > max) return false;
    return true;
  });
}
