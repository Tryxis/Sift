import { useState } from "react";
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
    const nextTab = event.key === "Home"
      ? "library"
      : event.key === "End"
        ? "metrics"
        : event.key === "ArrowRight"
          ? "metrics"
          : "library";
    setActiveTab(nextTab);
    document.getElementById(`view-tab-${nextTab}`)?.focus();
  };

  return (
    <>
      <ProfileSummary profile={library.profile} onResync={onResync} isSyncing={isSyncing} />
      <section className="relative z-10 pt-5 sm:pt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <StatusFilter value={filters.status} counts={filters.statusCounts} onChange={filters.setStatus} />
          <FilterBar
            activeFilters={filters.activeFilters}
            onFilterChange={filters.setFilter}
            playedBefore={filters.playedBefore}
            onPlayedBeforeChange={filters.setPlayedBefore}
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
        ) : (
          <div id="view-panel-metrics" role="tabpanel" aria-labelledby="view-tab-metrics">
            <MetricsDashboard games={library.games} filteredGames={filters.filteredGames} />
          </div>
        )}
      </section>
    </>
  );
}
