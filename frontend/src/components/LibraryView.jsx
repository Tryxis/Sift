import { useEffect, useState } from "react";
import { Search, X, Clock, ThumbsUp, LayoutGrid, List, Save, Trash2, ChevronDown } from "lucide-react";
import { createFilterConfiguration, useGameFilters } from "@/hooks/useGameFilters";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FilterBar } from "./FilterBar";
import { GameCover } from "./GameCover";
import { GameGrid } from "./GameGrid";
import { GameTable } from "./GameTable";
import { MetricsDashboard } from "./MetricsDashboard";
import { Pagination } from "./Pagination";
import { ProfileSummary } from "./ProfileSummary";
import { StatsPanel } from "./StatsPanel";
import { StatusFilter } from "./StatusFilter";
import { formatHours } from "@/lib/format";

function PlayNextList({ games }) {
  const [expandedGameId, setExpandedGameId] = useState(null);

  return (
    <ol className="rounded-card border border-border bg-card px-4">
      {games.map((game, index) => {
        const expanded = expandedGameId === game.appId;
        const detailsId = `play-next-details-${game.appId}`;
        const estimates = [
          ["Main story", game.timeToBeatMainMinutes],
          ["Main + extras", game.timeToBeatMainExtrasMinutes],
          ["Completionist", game.timeToBeatCompletionistMinutes],
        ];

        return (
          <li key={game.appId} className="border-b border-border last:border-0">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={detailsId}
              className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:text-foreground"
              onClick={() => setExpandedGameId(expanded ? null : game.appId)}
            >
              <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm" title={game.name}>{game.name}</span>
              <span className="flex shrink-0 items-center gap-3 text-xs tabular-nums text-muted-foreground">
                <span className="flex items-center gap-1" title="Steam review score">
                  <ThumbsUp className="h-3 w-3" aria-hidden="true" />
                  {game.reviewScore.toFixed(1)}%
                </span>
                <span className="flex items-center gap-1" title="HLTB main-story estimate">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {game.timeToBeatMainMinutes == null ? "—" : formatHours(game.timeToBeatMainMinutes)}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            <div
              id={detailsId}
              aria-hidden={!expanded}
              className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className={`min-h-0 overflow-hidden transition-[opacity,transform] duration-200 ease-out ${
                expanded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}>
                <div className="grid gap-4 pb-4 pl-8 sm:grid-cols-[minmax(0,320px)_1fr] sm:items-start">
                  <GameCover
                    appId={game.appId}
                    name={game.name}
                    src={game.headerImageUrl}
                    className="w-full max-w-sm rounded-card border"
                  />
                  <div className="grid gap-4 sm:w-fit sm:grid-cols-[max-content_max-content] sm:gap-6">
                    <section aria-label="HowLongToBeat estimates">
                      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">HowLongToBeat</h3>
                      <dl className="mt-2 grid w-fit grid-cols-[max-content_max-content] gap-x-4 gap-y-2">
                        {estimates.map(([label, minutes]) => (
                          <div key={label} className="contents">
                            <dt className="text-xs text-muted-foreground">{label}</dt>
                            <dd className="text-sm tabular-nums">{minutes == null ? "—" : formatHours(minutes)}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                    <section aria-label="Steam review score" className="border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Steam reviews</h3>
                      <p className="mt-2 flex items-center gap-2 text-sm tabular-nums">
                        <ThumbsUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        {game.reviewScore.toFixed(1)}%
                        {game.reviewCount != null && (
                          <span className="text-xs text-muted-foreground">
                            {game.reviewCount.toLocaleString()} reviews
                          </span>
                        )}
                      </p>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function LibraryView({ library, isSyncing, onResync, onUpdateGame }) {
  const filters = useGameFilters(library.games);
  const [activeTab, setActiveTab] = useState("library");
  const [presentation, setPresentation] = useState("cards");
  const [savedViews, setSavedViews] = useState([]);
  const [selectedViewId, setSelectedViewId] = useState("");
  const [savedViewName, setSavedViewName] = useState("");
  const [savedViewsLoading, setSavedViewsLoading] = useState(true);
  const [savedViewsError, setSavedViewsError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.getSavedViews(library.profile.steamId)
      .then((views) => {
        if (cancelled) return;
        setSavedViews(views);
        const selectedView = views.find((view) => view.isSelected);
        if (selectedView) {
          setSelectedViewId(selectedView.id);
          filters.applyConfiguration(selectedView.configuration);
        }
      })
      .catch((error) => {
        if (!cancelled) setSavedViewsError(`Saved views couldn't be loaded: ${error.message}`);
      })
      .finally(() => {
        if (!cancelled) setSavedViewsLoading(false);
      });
    return () => { cancelled = true; };
  }, [library.profile.steamId, filters.applyConfiguration]);

  const selectSavedView = async (id) => {
    setSavedViewsError("");
    try {
      const views = await api.selectSavedView(library.profile.steamId, id || null);
      setSavedViews(views);
      setSelectedViewId(id);
      const selectedView = views.find((view) => view.id === id);
      if (selectedView) filters.applyConfiguration(selectedView.configuration);
      else filters.clearFilters();
    } catch (error) {
      setSavedViewsError(`Saved view couldn't be selected: ${error.message}`);
    }
  };

  const saveCurrentView = async (event) => {
    event.preventDefault();
    const name = savedViewName.trim();
    if (!name) return;
    setSavedViewsError("");
    try {
      const saved = await api.createSavedView(library.profile.steamId, {
        name,
        configuration: createFilterConfiguration(filters),
      });
      setSavedViews((current) => [
        ...current.map((view) => ({ ...view, isSelected: false })),
        saved,
      ].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedViewId(saved.id);
      setSavedViewName("");
    } catch (error) {
      setSavedViewsError(`Saved view couldn't be saved: ${error.message}`);
    }
  };

  const updateSelectedView = async () => {
    if (!selectedViewId) return;
    const view = savedViews.find((item) => item.id === selectedViewId);
    if (!view) return;
    setSavedViewsError("");
    try {
      const updated = await api.updateSavedView(library.profile.steamId, selectedViewId, {
        name: view.name,
        configuration: createFilterConfiguration(filters),
      });
      setSavedViews((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated, isSelected: true } : item));
    } catch (error) {
      setSavedViewsError(`Saved view couldn't be updated: ${error.message}`);
    }
  };

  const deleteSelectedView = async () => {
    if (!selectedViewId) return;
    setSavedViewsError("");
    try {
      await api.deleteSavedView(library.profile.steamId, selectedViewId);
      const views = savedViews.filter((view) => view.id !== selectedViewId);
      setSavedViews(views);
      setSelectedViewId("");
      filters.clearFilters();
    } catch (error) {
      setSavedViewsError(`Saved view couldn't be deleted: ${error.message}`);
    }
  };

  const clearFiltersAndSavedView = async () => {
    await selectSavedView("");
  };

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
        <div
          className="mb-5 flex gap-2 border-b border-border"
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
        {activeTab === "library" && <StatsPanel games={filters.filteredGames} className="mb-5" />}

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
        <div className="mb-5 flex flex-col gap-2 rounded-card border border-border bg-card/70 p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="sr-only" htmlFor="saved-view-select">Saved filter views</label>
          <div className="relative">
            <select
              id="saved-view-select"
              value={selectedViewId}
              onChange={(event) => {
                if (event.target.value) selectSavedView(event.target.value);
              }}
              disabled={savedViewsLoading}
              className="h-9 min-w-48 appearance-none rounded-well border border-border-strong bg-abyss py-2 pl-3 pr-9 text-sm text-foreground disabled:opacity-50"
            >
              <option value="" disabled>{savedViewsLoading ? "Loading saved views…" : "Saved filter views"}</option>
              {savedViews.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          </div>
          <Button variant="ghost" size="sm" onClick={clearFiltersAndSavedView}>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear filters
          </Button>
          {selectedViewId && (
            <>
              <Button variant="outline" size="sm" onClick={updateSelectedView}>
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                Update selected
              </Button>
              <Button variant="ghost" size="sm" onClick={deleteSelectedView} aria-label="Delete selected saved view">
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete
              </Button>
            </>
          )}
          <form className="flex min-w-0 flex-1 flex-wrap gap-2 sm:justify-end" onSubmit={saveCurrentView}>
            <label htmlFor="saved-view-name" className="sr-only">Name for saved view</label>
            <input
              id="saved-view-name"
              value={savedViewName}
              onChange={(event) => setSavedViewName(event.target.value)}
              maxLength={80}
              placeholder="Name this filter view"
              className="h-9 min-w-40 flex-1 rounded-well border border-border-strong bg-abyss px-3 text-sm placeholder:text-muted-foreground/70 sm:max-w-56"
            />
            <Button type="submit" variant="outline" size="sm" disabled={savedViewsLoading || !savedViewName.trim()}>
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              Save view
            </Button>
          </form>
          {savedViewsError && <p role="alert" className="basis-full text-sm text-status-abandoned">{savedViewsError}</p>}
        </div>

        {activeTab === "library" ? (
          <div id="view-panel-library" role="tabpanel" aria-labelledby="view-tab-library">
            <div id="library-grid" className="scroll-mt-6 pt-8 sm:pt-10">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{filters.filteredCount.toLocaleString()} games</p>
                <div className="relative grid h-8 w-48 grid-cols-2 overflow-hidden rounded-well border border-border-strong bg-abyss p-0" role="group" aria-label="Game presentation">
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-status-playing/30 transition-transform duration-200 ease-out ${presentation === "table" ? "translate-x-full" : ""}`}
                  />
                  <button
                    type="button"
                    aria-pressed={presentation === "cards"}
                    onClick={() => setPresentation("cards")}
                    className={`relative z-10 flex items-center justify-center gap-1.5 rounded-none text-xs font-medium transition-colors ${presentation === "cards" ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" /> Cards
                  </button>
                  <button
                    type="button"
                    aria-pressed={presentation === "table"}
                    onClick={() => setPresentation("table")}
                    className={`relative z-10 flex items-center justify-center gap-1.5 rounded-none text-xs font-medium transition-colors ${presentation === "table" ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    <List className="h-3.5 w-3.5" aria-hidden="true" /> Table
                  </button>
                </div>
              </div>
              {presentation === "cards"
                ? <GameGrid games={filters.pageItems} onUpdateGame={onUpdateGame} onClearFilters={clearFiltersAndSavedView} />
                : (
                  <GameTable
                    games={filters.pageItems}
                    sortColumn={filters.tableSortColumn}
                    sortDirection={filters.tableSortDirection}
                    onSortChange={filters.setTableSort}
                    onUpdateGame={onUpdateGame}
                  />
                )}

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
                <PlayNextList games={playNextGames} />
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
