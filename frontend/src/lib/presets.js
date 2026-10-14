// Built-in views. They ship with the app (not stored per profile) and can be saved as
// your own view to tweak. Shape matches a saved view's configuration.
const range = (min = "", max = "") => ({ min: String(min), max: String(max) });
const sort = (column, direction) => ({ tableSortColumn: column, tableSortDirection: direction });

export const PRESET_VIEWS = [
  {
    id: "quick-wins",
    name: "Quick wins",
    description: "Backlog games under 5 hours with an 85%+ rating.",
    configuration: {
      selectedStatuses: ["Backlog"],
      activeFilters: { timeToBeat: range("", 5), reviewScore: range(85) },
      ...sort("reviewScore", "descending"),
    },
  },
  {
    id: "weekend",
    name: "Weekend games",
    description: "Unfinished games you could finish in under 10 hours.",
    configuration: {
      selectedStatuses: ["Backlog", "Playing"],
      activeFilters: { timeToBeat: range("", 10) },
      ...sort("reviewScore", "descending"),
    },
  },
  {
    id: "best-value",
    name: "Best value",
    description: "Backlog sorted by review score per hour of main story.",
    configuration: { selectedStatuses: ["Backlog"], ...sort("value", "descending") },
  },
  {
    id: "hidden-gems",
    name: "Hidden gems",
    description: "Unplayed games rated 85%+ that fewer than 5,000 people have reviewed.",
    configuration: {
      activeFilters: { hours: range("", 0), reviewScore: range(85), reviewCount: range("", 5000) },
      ...sort("reviewScore", "descending"),
    },
  },
  {
    id: "started-unfinished",
    name: "Started, never finished",
    description: "Backlog games with 1–5 hours played: resume or let go.",
    configuration: {
      selectedStatuses: ["Backlog"],
      activeFilters: { hours: range(1, 5) },
      ...sort("lastPlayed", "descending"),
    },
  },
  {
    id: "stalled",
    name: "Stalled",
    description: "Marked Playing but untouched for 60+ days.",
    configuration: {
      selectedStatuses: ["Playing"],
      activeFilters: { daysSincePlayed: range(60) },
      ...sort("lastPlayed", "ascending"),
    },
  },
  {
    id: "nearly-there",
    name: "Nearly there",
    description: "Unfinished games where you've played 70%+ of the main story estimate.",
    configuration: {
      selectedStatuses: ["Backlog", "Playing"],
      activeFilters: { progress: range(70) },
      ...sort("progress", "descending"),
    },
  },
  {
    id: "barely-touched",
    name: "Barely touched",
    description: "Launched, but under 30 minutes played.",
    configuration: { activeFilters: { hours: range(0.01, 0.5) }, ...sort("hours", "ascending") },
  },
  {
    id: "long-haul",
    name: "Long haul",
    description: "Backlog games with a 40+ hour main story.",
    configuration: {
      selectedStatuses: ["Backlog"],
      activeFilters: { timeToBeat: range(40) },
      ...sort("reviewScore", "descending"),
    },
  },
  {
    id: "active",
    name: "Recently active",
    description: "Anything played in the last two weeks.",
    configuration: { activeFilters: { recentHours: range(0.01) }, ...sort("recentHours", "descending") },
  },
  {
    id: "sunk-cost",
    name: "Sunk cost",
    description: "Abandoned games, most hours sunk first.",
    configuration: { selectedStatuses: ["Abandoned"], ...sort("finishedHours", "descending") },
  },
  {
    id: "replays",
    name: "Replays",
    description: "Backlog games you've played before on another platform.",
    configuration: { selectedStatuses: ["Backlog"], playedBefore: true },
  },
  {
    id: "with-notes",
    name: "With notes",
    description: "Every game you've written a note on.",
    configuration: { hasNotes: true },
  },
];
