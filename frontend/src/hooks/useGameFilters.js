import { useCallback, useMemo, useState } from "react";
import { LEGACY_COMPLETED_BEFORE, STATUSES } from "@/lib/status";
import { FILTERS_BY_ID, hasBound, matchesFilters } from "@/lib/filters";
import { progressPercent, valueScore } from "@/lib/gameMath";

export const PAGE_SIZES = [10, 20, 50, 100];

export const SORT_OPTIONS = [
  { id: "name", label: "Name", read: (g) => g.name, defaultDirection: "ascending" },
  { id: "status", label: "Status", read: (g) => STATUSES.indexOf(g.status), defaultDirection: "ascending" },
  { id: "hours", label: "Hours played", read: (g) => g.playtimeForeverMinutes, defaultDirection: "descending" },
  { id: "recentHours", label: "Hours, last 2 weeks", read: (g) => g.playtimeTwoWeeksMinutes || null, defaultDirection: "descending" },
  { id: "lastPlayed", label: "Last played", read: (g) => (g.lastPlayedUtc ? Date.parse(g.lastPlayedUtc) : null), defaultDirection: "descending" },
  { id: "reviewScore", label: "Review score", read: (g) => g.reviewScore, defaultDirection: "descending" },
  { id: "reviewCount", label: "Review count", read: (g) => g.reviewCount, defaultDirection: "descending" },
  { id: "timeToBeat", label: "Time to beat", read: (g) => g.timeToBeatMainMinutes, defaultDirection: "ascending" },
  { id: "progress", label: "Progress vs HLTB", read: progressPercent, defaultDirection: "descending" },
  { id: "value", label: "Best value (score per hour)", read: valueScore, defaultDirection: "descending" },
  { id: "priority", label: "Queue position", read: (g) => g.priority || null, defaultDirection: "ascending" },
  { id: "achievements", label: "Achievements %", read: (g) => (g.achievementsTotal ? g.achievementsUnlocked / g.achievementsTotal : null), defaultDirection: "descending" },
  { id: "releaseYear", label: "Release year", read: (g) => g.releaseYear, defaultDirection: "descending" },
  { id: "statusChanged", label: "Status last changed", read: (g) => (g.statusChangedUtc ? Date.parse(g.statusChangedUtc) : null), defaultDirection: "descending" },
  { id: "finishedHours", label: "Finished hours", read: (g) => g.finishedHours, defaultDirection: "descending" },
  { id: "playedBefore", label: "Played before", read: (g) => (g.playedBefore ? 1 : 0), defaultDirection: "descending" },
];

const SORTS_BY_ID = Object.fromEntries(SORT_OPTIONS.map((option) => [option.id, option]));

export const DEFAULT_CONFIGURATION = Object.freeze({
  selectedStatuses: [],
  excludedStatuses: [],
  activeFilters: {},
  playedBefore: null,
  hasNotes: null,
  genres: [],
  deckCompatibility: [],
  multiplayer: null,
  showNotInterested: null,
  reviewScoreOrder: null,
  searchQuery: "",
  pageSize: 20,
  tableSortColumn: null,
  tableSortDirection: null,
});

export function createFilterConfiguration(filters) {
  return {
    selectedStatuses: [...filters.selectedStatuses],
    excludedStatuses: [...filters.excludedStatuses],
    activeFilters: structuredClone(filters.activeFilters),
    playedBefore: filters.playedBefore,
    hasNotes: filters.hasNotes,
    genres: [...filters.genres],
    deckCompatibility: [...filters.deckCompatibility],
    multiplayer: filters.multiplayer,
    showNotInterested: filters.notInterested,
    // Sorting is unified under tableSort*; reviewScoreOrder is kept for older saved views.
    reviewScoreOrder: null,
    searchQuery: filters.searchQuery,
    pageSize: filters.pageSize,
    tableSortColumn: filters.sortColumn,
    tableSortDirection: filters.sortDirection,
  };
}

/** Comparable form of a configuration, ignoring empty range filters and key order. */
export function configurationKey(configuration) {
  const c = { ...DEFAULT_CONFIGURATION, ...configuration };
  const legacyReviewOrder = c.reviewScoreOrder;
  const filters = Object.entries(c.activeFilters ?? {})
    .filter(([, bounds]) => hasBound(bounds))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, b]) => [id, `${b.min ?? ""}`, `${b.max ?? ""}`]);
  return JSON.stringify([
    upgradeStatuses(c.selectedStatuses).sort(),
    upgradeStatuses(c.excludedStatuses).sort(),
    filters,
    c.playedBefore ?? null,
    c.hasNotes ?? null,
    [...(c.genres ?? [])].sort(),
    [...(c.deckCompatibility ?? [])].sort(),
    c.multiplayer ?? null,
    c.showNotInterested ?? null,
    (c.searchQuery ?? "").trim(),
    c.tableSortColumn ?? (legacyReviewOrder ? "reviewScore" : null),
    c.tableSortDirection ?? legacyReviewOrder ?? null,
  ]);
}

function matchesStatus(game, selectedStatuses, excludedStatuses) {
  if (excludedStatuses.includes(game.status)) return false;
  return selectedStatuses.length === 0 || selectedStatuses.includes(game.status);
}

/** Older saved views name the old "Completed before" filter; it's the CompletedBefore status now. */
const stringList = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === "string") : []);
const upgradeStatuses = (statuses) => [
  ...new Set(stringList(statuses).map((status) => (status === LEGACY_COMPLETED_BEFORE ? "CompletedBefore" : status))),
].filter((status) => STATUSES.includes(status));
const booleanOrNull = (value) => (typeof value === "boolean" ? value : null);
const directionOrNull = (value) => (value === "ascending" || value === "descending" ? value : null);
const knownFilters = (value) =>
  Object.fromEntries(
    Object.entries(value && typeof value === "object" ? value : {}).filter(
      ([id, bounds]) => FILTERS_BY_ID[id] && bounds && typeof bounds === "object"
    )
  );

/**
 * All client-side list shaping: status selection, granular filters, sorting and pagination.
 *
 * Two derived sets are exposed:
 * - scopedGames: every filter except status. Stats and status counts describe this set, so
 *   picking a status doesn't collapse "Completed" to 0% — it highlights a slice of the scope.
 * - filteredGames: scope narrowed by the selected/excluded statuses, sorted. This is what's listed.
 *
 * Any change to a filter or page size sends you back to page 1.
 */
export function useGameFilters(games) {
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [excludedStatuses, setExcludedStatuses] = useState([]);
  const [activeFilters, setActiveFilters] = useState({}); // { [filterId]: { min, max } }
  const [playedBefore, setPlayedBeforeState] = useState(null);
  const [hasNotes, setHasNotesState] = useState(null);
  const [genres, setGenresState] = useState([]);
  const [deckCompatibility, setDeckState] = useState([]);
  const [multiplayer, setMultiplayerState] = useState(null);
  const [notInterested, setNotInterestedState] = useState(null);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState(null);
  const [searchQuery, setSearchQueryState] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(20);

  const scopedGames = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
    return games.filter(
      (g) =>
        (playedBefore === null || g.playedBefore === playedBefore) &&
        (hasNotes === null || Boolean(g.notes?.trim()) === hasNotes) &&
        (notInterested === null || Boolean(g.notInterested) === notInterested) &&
        (multiplayer === null || g.isMultiplayer === multiplayer) &&
        (genres.length === 0 || genres.some((genre) => g.genres?.includes(genre))) &&
        (deckCompatibility.length === 0 || deckCompatibility.includes(g.deckCompatibility ?? "Unknown")) &&
        (!normalizedSearch || g.name.toLocaleLowerCase().includes(normalizedSearch)) &&
        matchesFilters(g, activeFilters)
    );
  }, [games, playedBefore, hasNotes, notInterested, multiplayer, genres, deckCompatibility, searchQuery, activeFilters]);

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    scopedGames.forEach((g) => {
      counts[g.status] = (counts[g.status] ?? 0) + 1;
    });
    return { All: scopedGames.length, ...counts };
  }, [scopedGames]);

  const filtered = useMemo(() => {
    const result = scopedGames.filter((g) => matchesStatus(g, selectedStatuses, excludedStatuses));
    const sort = sortColumn && sortDirection ? SORTS_BY_ID[sortColumn] : null;
    if (sort) {
      const direction = sortDirection === "ascending" ? 1 : -1;
      result.sort((a, b) => {
        const left = sort.read(a);
        const right = sort.read(b);
        // Missing values always sink to the bottom, whichever way the column is sorted.
        if (left == null) return right == null ? a.name.localeCompare(b.name) : 1;
        if (right == null) return -1;
        const order = typeof left === "string" ? left.localeCompare(right) : left - right;
        return order * direction || a.name.localeCompare(b.name);
      });
    }
    return result;
  }, [scopedGames, selectedStatuses, excludedStatuses, sortColumn, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;

  const setFilter = useCallback((id, bounds) => {
    setActiveFilters((current) => {
      const next = { ...current };
      if (bounds === null) delete next[id];
      else next[id] = bounds;
      return next;
    });
    setPage(1);
  }, []);

  const applyConfiguration = useCallback((configuration) => {
    // Configurations also arrive from shared links and older saved views, so each value is checked.
    const c = { ...DEFAULT_CONFIGURATION, ...configuration };
    setSelectedStatuses(upgradeStatuses(c.selectedStatuses));
    setExcludedStatuses(upgradeStatuses(c.excludedStatuses));
    setActiveFilters(knownFilters(c.activeFilters));
    setPlayedBeforeState(booleanOrNull(c.playedBefore));
    setHasNotesState(booleanOrNull(c.hasNotes));
    setGenresState(stringList(c.genres));
    setDeckState(stringList(c.deckCompatibility));
    setMultiplayerState(booleanOrNull(c.multiplayer));
    setNotInterestedState(booleanOrNull(c.showNotInterested));
    // Older saved views stored a separate review-score order; fold it into the unified sort.
    const legacyReviewOrder = directionOrNull(c.reviewScoreOrder);
    const sortColumn = SORT_OPTIONS.some((option) => option.id === c.tableSortColumn) ? c.tableSortColumn : null;
    setSortColumn(sortColumn ?? (legacyReviewOrder ? "reviewScore" : null));
    setSortDirection((sortColumn && directionOrNull(c.tableSortDirection)) ?? legacyReviewOrder ?? null);
    setSearchQueryState(typeof c.searchQuery === "string" ? c.searchQuery : "");
    setPageSizeState(PAGE_SIZES.includes(c.pageSize) ? c.pageSize : 20);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    applyConfiguration({ pageSize });
  }, [applyConfiguration, pageSize]);

  /** Status chips cycle: off → show only → hide → off. */
  const cycleStatus = useCallback((value) => {
    const isSelected = selectedStatuses.includes(value);
    const isExcluded = excludedStatuses.includes(value);
    if (!isSelected && !isExcluded) setSelectedStatuses((current) => [...current, value]);
    else if (isSelected) {
      setSelectedStatuses((current) => current.filter((status) => status !== value));
      setExcludedStatuses((current) => [...current, value]);
    } else setExcludedStatuses((current) => current.filter((status) => status !== value));
    setPage(1);
  }, [selectedStatuses, excludedStatuses]);

  /** Plain include toggle (used by the stats legend). */
  const toggleStatus = useCallback((value) => {
    setExcludedStatuses((current) => current.filter((status) => status !== value));
    setSelectedStatuses((current) =>
      current.includes(value) ? current.filter((status) => status !== value) : [...current, value]
    );
    setPage(1);
  }, []);

  const clearStatuses = useCallback(() => {
    setSelectedStatuses([]);
    setExcludedStatuses([]);
    setPage(1);
  }, []);

  // Filters that narrow the scope (everything except status and sort).
  const scopeFilterCount =
    Object.values(activeFilters).filter(hasBound).length +
    (playedBefore === null ? 0 : 1) +
    (hasNotes === null ? 0 : 1) +
    (notInterested === null ? 0 : 1) +
    (multiplayer === null ? 0 : 1) +
    (genres.length ? 1 : 0) +
    (deckCompatibility.length ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const withPageReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return {
    selectedStatuses,
    excludedStatuses,
    cycleStatus,
    toggleStatus,
    clearStatuses,
    sortColumn,
    sortDirection,
    setSort: (column, direction) => {
      setSortColumn(column);
      setSortDirection(column ? direction : null);
      setPage(1);
    },
    activeFilters,
    setFilter,
    applyConfiguration,
    searchQuery,
    setSearchQuery: withPageReset(setSearchQueryState),
    playedBefore,
    setPlayedBefore: withPageReset(setPlayedBeforeState),
    hasNotes,
    setHasNotes: withPageReset(setHasNotesState),
    genres,
    setGenres: withPageReset(setGenresState),
    deckCompatibility,
    setDeckCompatibility: withPageReset(setDeckState),
    multiplayer,
    setMultiplayer: withPageReset(setMultiplayerState),
    notInterested,
    setNotInterested: withPageReset(setNotInterestedState),
    statusCounts,
    scopedGames,
    scopeFilterCount,
    isFiltered: scopeFilterCount > 0 || selectedStatuses.length > 0 || excludedStatuses.length > 0,
    filteredGames: filtered,
    filteredCount: filtered.length,
    pageItems: filtered.slice(start, start + pageSize),
    page: currentPage,
    pageCount,
    setPage,
    pageSize,
    setPageSize: withPageReset(setPageSizeState),
    rangeStart: filtered.length ? start + 1 : 0,
    rangeEnd: Math.min(start + pageSize, filtered.length),
    clearFilters,
  };
}
