import { useMemo, useState } from "react";
import { COMPLETED_BEFORE_FILTER, STATUSES } from "@/lib/status";
import { matchesFilters } from "@/lib/filters";

export const PAGE_SIZES = [10, 20, 50, 100];

/**
 * All client-side list shaping: status selection, granular filters, sorting and pagination.
 * Any change to a filter or page size sends you back to page 1.
 */
export function useGameFilters(games) {
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [activeFilters, setActiveFilters] = useState({}); // { [filterId]: { min, max } }
  const [playedBefore, setPlayedBeforeState] = useState(null);
  const [reviewScoreOrder, setReviewScoreOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(20);

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    games.forEach((g) => (counts[g.status] = (counts[g.status] ?? 0) + 1));
    counts[COMPLETED_BEFORE_FILTER] = games.filter((game) => game.status === "Completed" && game.playedBefore).length;
    return { All: games.length, ...counts };
  }, [games]);

  const filtered = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
    const result = games.filter(
      (g) =>
        (selectedStatuses.length === 0 || selectedStatuses.some((status) =>
          status === COMPLETED_BEFORE_FILTER
            ? g.status === "Completed" && g.playedBefore
            : g.status === status
        )) &&
        (playedBefore === null || g.playedBefore === playedBefore) &&
        (!normalizedSearch || g.name.toLocaleLowerCase().includes(normalizedSearch)) &&
        matchesFilters(g, activeFilters)
    );
    if (reviewScoreOrder) {
      result.sort((a, b) => {
        if (a.reviewScore == null) return b.reviewScore == null ? a.name.localeCompare(b.name) : 1;
        if (b.reviewScore == null) return -1;
        const scoreOrder = reviewScoreOrder === "ascending" ? 1 : -1;
        return (a.reviewScore - b.reviewScore) * scoreOrder || a.name.localeCompare(b.name);
      });
    }
    return result;
  }, [games, selectedStatuses, playedBefore, searchQuery, activeFilters, reviewScoreOrder]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;

  const setFilter = (id, bounds) => {
    setActiveFilters((current) => {
      const next = { ...current };
      if (bounds === null) delete next[id];
      else next[id] = bounds;
      return next;
    });
    setPage(1);
  };

  return {
    selectedStatuses,
    setSelectedStatuses: (value) => {
      setSelectedStatuses(value);
      setPage(1);
    },
    toggleStatus: (value) => {
      setSelectedStatuses((current) =>
        current.includes(value) ? current.filter((status) => status !== value) : [...current, value]
      );
      setPage(1);
    },
    clearStatuses: () => {
      setSelectedStatuses([]);
      setPage(1);
    },
    activeFilters,
    setFilter,
    reviewScoreOrder,
    setReviewScoreOrder: (value) => {
      setReviewScoreOrder(value);
      setPage(1);
    },
    searchQuery,
    setSearchQuery: (value) => {
      setSearchQuery(value);
      setPage(1);
    },
    playedBefore,
    setPlayedBefore: (value) => {
      setPlayedBeforeState(value);
      setPage(1);
    },
    statusCounts,
    filteredGames: filtered,
    filteredCount: filtered.length,
    pageItems: filtered.slice(start, start + pageSize),
    page: currentPage,
    pageCount,
    setPage,
    pageSize,
    setPageSize: (value) => {
      setPageSizeState(value);
      setPage(1);
    },
    rangeStart: filtered.length ? start + 1 : 0,
    rangeEnd: Math.min(start + pageSize, filtered.length),
    clearFilters: () => {
      setSelectedStatuses([]);
      setActiveFilters({});
      setPlayedBeforeState(null);
      setReviewScoreOrder(null);
      setSearchQuery("");
      setPage(1);
    },
  };
}
