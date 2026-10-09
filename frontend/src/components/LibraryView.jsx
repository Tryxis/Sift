import { useState } from "react";
import { Search, X, Clock, ThumbsUp } from "lucide-react";
import { useGameFilters } from "@/hooks/useGameFilters";
import { FilterBar } from "./FilterBar";
import { GameGrid } from "./GameGrid";
import { MetricsDashboard } from "./MetricsDashboard";
import { Pagination } from "./Pagination";
import { ProfileSummary } from "./ProfileSummary";
import { StatsPanel } from "./StatsPanel";
import { StatusFilter } from "./StatusFilter";

export function LibraryView({ library, isSyncing, onResync, onUpdateGame }) {
  const filters = useGameFilters(library.games);
  const [activeTab, setActiveTab] = useState("library");

  const changePage = (page) => {
    filters.setPage(page);
    document.getElementById("library-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleTabKeyDown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const tabs = ["library", "play-next", "metrics"];
    const currentIndex = tabs.indexOf(activeTab);
    const nextTab = event.key === "Home"
      ? tabs[0]
      : event.key === "End"
        ? tabs[tabs.length - 1]
        : tabs[(currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    setActiveTab(nextTab);
    document.getElementById(`view-tab-${nextTab}`)?.focus();
  };

  const playNextGames = filters.filteredGames
    .filter((game) => game.status === "Backlog" && game.playtimeForeverMinutes === 0 && game.reviewScore != null)
    .sort((a, b) => b.reviewScore - a.reviewScore || (a.timeToBeatMainMinutes ?? Infinity) - (b.timeToBeatMainMinutes ?? Infinity));

  return (
    <>
      <ProfileSummary profile={library.profile} onResync={onResync} isSyncing={isSyncing} />
      <section className="relative z-10 pt-5 sm:pt-6">
        <div className="relative mb-4 max-w-xl">
          <label htmlFor="game-search" className="sr-only">Search games</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="game-search"
            type="search"
            value={filters.searchQuery}
            onChange={(event) => filters.setSearchQuery(event.target.value)}
            placeholder="Search your games"
            className="h-10 w-full rounded-well border border-border-strong bg-abyss py-2 pl-9 pr-10 text-base text-foreground placeholder:text-muted-foreground/70 focus-visible:border-muted-foreground/60 sm:text-sm"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => filters.setSearchQuery("")}
              aria-label="Clear game search"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <StatusFilter
            selectedStatuses={filters.selectedStatuses}
            counts={filters.statusCounts}
            onToggle={filters.toggleStatus}
            onClear={filters.clearStatuses}
          />
          <FilterBar
            activeFilters={filters.activeFilters}
            onFilterChange={filters.setFilter}
            playedBefore={filters.playedBefore}
            onPlayedBeforeChange={filters.setPlayedBefore}
            reviewScoreOrder={filters.reviewScoreOrder}
            onReviewScoreOrderChange={filters.setReviewScoreOrder}
          />
        </div>

        <div
          className="mb-6 flex gap-2 border-b border-border"
          role="tablist"
          aria-label="Library views"
          onKeyDown={handleTabKeyDown}
        >
          {[
            ["library", "Library"],
            ["play-next", "Play Next"],
            ["metrics", "Metrics"],
          ].map(([tab, label]) => (
            <button
              key={tab}
              id={`view-tab-${tab}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`view-panel-${tab}`}
              tabIndex={activeTab === tab ? 0 : -1}
              onClick={() => setActiveTab(tab)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
                activeTab === tab
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "library" ? (
          <div id="view-panel-library" role="tabpanel" aria-labelledby="view-tab-library">
            <StatsPanel games={filters.filteredGames} />
            <div id="library-grid" className="scroll-mt-6 pt-8 sm:pt-10">
              <GameGrid games={filters.pageItems} onUpdateGame={onUpdateGame} onClearFilters={filters.clearFilters} />

              <Pagination
                page={filters.page}
                pageCount={filters.pageCount}
                pageSize={filters.pageSize}
                total={filters.filteredCount}
                rangeStart={filters.rangeStart}
                rangeEnd={filters.rangeEnd}
                onPageChange={changePage}
                onPageSizeChange={filters.setPageSize}
              />
            </div>
          </div>
        ) : activeTab === "play-next" ? (
          <div id="view-panel-play-next" role="tabpanel" aria-labelledby="view-tab-play-next">
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Play Next</h2>
                <p className="text-sm text-muted-foreground">Unplayed, rated backlog games, ranked by review score. Current filters apply.</p>
              </div>
              {playNextGames.length ? (
                <ol className="rounded-card border border-border bg-card px-4">
                  {playNextGames.map((game, index) => (
                    <li key={game.appId} className="flex items-center gap-3 border-b border-border py-2.5 last:border-0">
                      <span className="w-5 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm" title={game.name}>{game.name}</span>
                      <span className="flex shrink-0 items-center gap-3 text-xs tabular-nums text-muted-foreground">
                        <span className="flex items-center gap-1" title="Steam review score">
                          <ThumbsUp className="h-3 w-3" aria-hidden="true" />
                          {game.reviewScore.toFixed(1)}%
                        </span>
                        <span className="flex items-center gap-1" title="HLTB main-story estimate">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {game.timeToBeatMainMinutes == null ? "—" : `${(game.timeToBeatMainMinutes / 60).toFixed(1)}h`}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="rounded-card border border-border bg-card p-4 text-sm text-muted-foreground">No unplayed, rated backlog games match the current filters.</p>
              )}
            </section>
          </div>
        ) : (
          <div id="view-panel-metrics" role="tabpanel" aria-labelledby="view-tab-metrics">
            <MetricsDashboard games={library.games} filteredGames={filters.filteredGames} />
          </div>
        )}
      </section>
    </>
  );
}
