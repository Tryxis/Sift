import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, LayoutGrid, List, Rows3, SlidersHorizontal, Sparkles } from "lucide-react";
import { configurationKey, createFilterConfiguration, useGameFilters } from "@/hooks/useGameFilters";
import { inversePatch } from "@/hooks/useLibrary";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSavedViews } from "@/hooks/useSavedViews";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { queueOf } from "@/lib/queue";
import { readViewFromUrl, writeViewToUrl } from "@/lib/viewUrl";
import { PRESET_VIEWS } from "@/lib/presets";
import { STATUSES, STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";
import { ActivityTab } from "./ActivityTab";
import { BulkActionsBar } from "./BulkActionsBar";
import { CompareTab } from "./CompareTab";
import { DataMenu } from "./DataMenu";
import { FilterBar } from "./FilterBar";
import { GameActionsProvider } from "./GameActions";
import { GameDetailsDialog } from "./GameDetailsDialog";
import { GameGrid } from "./GameGrid";
import { GameList } from "./GameList";
import { GameTable } from "./GameTable";
import { HistoryTab } from "./HistoryTab";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { MetricsDashboard } from "./MetricsDashboard";
import { Pagination } from "./Pagination";
import { PlayNext } from "./PlayNext";
import { ProfileSummary } from "./ProfileSummary";
import { SavedViewsMenu, SaveViewForm } from "./SavedViewsMenu";
import { StatsPanel } from "./StatsPanel";
import { StatusFilter } from "./StatusFilter";
import { WishlistTab } from "./WishlistTab";

const TABS = [
  ["library", "Library"],
  ["play-next", "Play Next"],
  ["activity", "Activity"],
  ["history", "History"],
  ["wishlist", "Wishlist"],
  ["compare", "Compare"],
  ["metrics", "Metrics"],
];
const FILTERED_TABS = new Set(["library", "play-next", "metrics"]);

const PRESENTATIONS = [
  ["cards", "Cards", LayoutGrid, "g"],
  ["list", "List", Rows3, "l"],
  ["table", "Table", List, "t"],
];
const PRESENTATION_KEY = "sift:presentation";

function readPresentation() {
  try {
    const stored = localStorage.getItem(PRESENTATION_KEY);
    return PRESENTATIONS.some(([id]) => id === stored) ? stored : "cards";
  } catch {
    return "cards";
  }
}

function PresentationToggle({ value, onChange }) {
  const index = PRESENTATIONS.findIndex(([id]) => id === value);
  return (
    <div className="relative grid h-8 w-56 grid-cols-3 overflow-hidden rounded-well border border-border-strong bg-abyss" role="group" aria-label="Game presentation">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-status-playing/30 transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {PRESENTATIONS.map(([id, label, Icon, key]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          title={`${label} (${key})`}
          className={`relative z-10 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${value === id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
        </button>
      ))}
    </div>
  );
}

function SearchField({ value, onChange }) {
  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor="game-search" className="sr-only">Search games</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        id="game-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          if (value) onChange("");
          else event.currentTarget.blur();
        }}
        placeholder="Search your games"
        className="h-10 w-full rounded-well border border-border-strong bg-abyss py-2 pl-9 pr-10 text-base text-foreground placeholder:text-muted-foreground/70 focus-visible:border-muted-foreground/60 sm:h-9 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear game search"
          className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border-strong px-1.5 text-[11px] text-muted-foreground sm:block">/</kbd>
      )}
    </div>
  );
}

function NewGamesBanner({ games, onOpen, onDismiss }) {
  if (!games.length) return null;
  const shown = games.slice(0, 4);
  return (
    <div className="mb-5 flex items-start gap-3 rounded-card border border-status-playing/40 bg-status-playing/[0.07] px-4 py-3 text-sm">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-status-playing" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        {games.length === 1 ? "1 new game" : `${games.length} new games`} since an earlier sync:{" "}
        {shown.map((game, index) => (
          <span key={game.appId}>
            <button type="button" className="underline-offset-2 hover:underline" onClick={() => onOpen(game.appId)}>{game.name}</button>
            {index < shown.length - 1 ? ", " : ""}
          </span>
        ))}
        {games.length > shown.length && ` and ${games.length - shown.length} more`}. They&apos;re badged “New” for a week.
      </p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function LibraryView({ library, newAppIds, isSyncing, onResync, onUpdateGame, onUpdateGames }) {
  const toast = useToast();
  const [urlView] = useState(readViewFromUrl);
  const filters = useGameFilters(library.games);
  const savedViews = useSavedViews(library.profile.steamId, filters, { restoreSelection: !urlView });
  const [activeTab, setActiveTab] = useState("library");
  const [presentation, setPresentationState] = useState(readPresentation);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isSavingView, setIsSavingView] = useState(false);
  const [activePresetId, setActivePresetId] = useState(null);
  const [detailsAppId, setDetailsAppId] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [newBannerDismissed, setNewBannerDismissed] = useState(false);

  // A shared link's filters win over the remembered saved view.
  const { applyConfiguration } = filters;
  useEffect(() => {
    if (urlView) applyConfiguration(urlView);
  }, [urlView, applyConfiguration]);

  const currentConfiguration = createFilterConfiguration(filters);
  const currentKey = configurationKey(currentConfiguration);
  useEffect(() => {
    writeViewToUrl(currentConfiguration);
    // currentKey (plus page size) captures every change that matters for the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, filters.pageSize]);

  const activePreset = savedViews.selectedView ? null : PRESET_VIEWS.find((preset) => preset.id === activePresetId) ?? null;
  const appliedView = savedViews.selectedView ?? activePreset;
  const isModified = Boolean(appliedView) && configurationKey(appliedView.configuration) !== currentKey;

  // ---- Updates, with an undo toast for anything that changes status ----
  const gamesRef = useRef(library.games);
  gamesRef.current = library.games;

  const updateGame = useCallback((appId, patch) => {
    const previous = gamesRef.current.find((game) => game.appId === appId);
    onUpdateGame(appId, patch);
    if (previous && "status" in patch && patch.status !== previous.status) {
      const inverse = inversePatch(previous, patch);
      toast.show({
        message: `${previous.name} → ${STATUS_META[patch.status].label}`,
        action: { label: "Undo", onClick: () => onUpdateGame(appId, inverse) },
      });
    }
  }, [onUpdateGame, toast]);

  const updateGamesWithUndo = useCallback(async (changes, message) => {
    if (!changes.length) return;
    const byId = new Map(gamesRef.current.map((game) => [game.appId, game]));
    const inverses = changes
      .filter(({ appId }) => byId.has(appId))
      .map(({ appId, patch }) => ({ appId, patch: inversePatch(byId.get(appId), patch) }));
    const failed = await onUpdateGames(changes.map(({ appId, patch }) => ({ appId, patch })));
    toast.show({
      message: failed ? `${message} (${failed} failed)` : message,
      action: { label: "Undo", onClick: () => onUpdateGames(inverses) },
      duration: 10000,
    });
  }, [onUpdateGames, toast]);

  const queuePositions = useMemo(
    () => new Map(queueOf(library.games).map((game, index) => [game.appId, index + 1])),
    [library.games]
  );

  const actions = useMemo(() => ({
    steamId: library.profile.steamId,
    games: library.games,
    newAppIds,
    queuePositions,
    openDetails: setDetailsAppId,
    updateGame,
    updateGames: onUpdateGames,
  }), [library.profile.steamId, library.games, newAppIds, queuePositions, updateGame, onUpdateGames]);

  const detailsGame = detailsAppId == null ? null : library.games.find((game) => game.appId === detailsAppId) ?? null;

  // ---- Views ----
  const setPresentation = (value) => {
    setPresentationState(value);
    try {
      localStorage.setItem(PRESENTATION_KEY, value);
    } catch {
      /* storage unavailable; the choice just won't persist */
    }
  };

  const applyPreset = (preset) => {
    savedViews.deselect();
    filters.applyConfiguration({ pageSize: filters.pageSize, ...preset.configuration });
    setActivePresetId(preset.id);
    if (!FILTERED_TABS.has(activeTab)) setActiveTab("library");
  };

  const clearAll = () => {
    setActivePresetId(null);
    if (savedViews.selectedView) savedViews.select("");
    else filters.clearFilters();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.show({ message: "Link to these filters copied", duration: 3000 });
    } catch {
      toast.show({ message: "Couldn't copy automatically. Copy the address bar instead.", duration: 5000 });
    }
  };

  const changePage = (page) => {
    filters.setPage(page);
    document.getElementById("library-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goToTab = (tab) => {
    setActiveTab(tab);
    document.getElementById(`view-tab-${tab}`)?.focus();
  };

  const handleTabKeyDown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const ids = TABS.map(([id]) => id);
    const currentIndex = ids.indexOf(activeTab);
    const nextTab = event.key === "Home"
      ? ids[0]
      : event.key === "End"
        ? ids[ids.length - 1]
        : ids[(currentIndex + (event.key === "ArrowRight" ? 1 : -1) + ids.length) % ids.length];
    goToTab(nextTab);
  };

  // ---- Bulk selection (table) — only games still in the filtered list count ----
  const visibleSelection = useMemo(
    () => filters.filteredGames.filter((game) => selectedIds.has(game.appId)),
    [filters.filteredGames, selectedIds]
  );
  const bulkChanges = (patchFor) => visibleSelection.map((game) => ({ appId: game.appId, patch: patchFor(game) })).filter(({ patch }) => patch);
  const bulkSetStatus = (status) =>
    updateGamesWithUndo(
      bulkChanges((game) => (game.status === status ? null : { status })),
      `${visibleSelection.length} games → ${STATUS_META[status].label}`
    );
  const bulkSetPlayedBefore = (value) =>
    updateGamesWithUndo(
      bulkChanges((game) => (game.playedBefore === value ? null : { playedBefore: value })),
      `Played before set to ${value ? "yes" : "no"} for ${visibleSelection.length} games`
    );
  const bulkAddToQueue = () => {
    let next = library.games.reduce((max, game) => Math.max(max, game.priority ?? 0), 0);
    const changes = visibleSelection
      .filter((game) => !(game.priority > 0))
      .map((game) => ({ appId: game.appId, patch: { priority: Math.min(++next, 9999) } }));
    updateGamesWithUndo(changes, `${changes.length} games added to Up Next`);
  };

  // ---- Keyboard shortcuts ----
  const statusKeys = Object.fromEntries(
    STATUSES.map((status, index) => [
      String(index + 1),
      ({ appId }) => {
        if (appId == null) return false;
        const game = gamesRef.current.find((item) => item.appId === appId);
        if (game && game.status !== status) updateGame(appId, { status });
        return true;
      },
    ])
  );
  const tabIds = TABS.map(([id]) => id);
  useKeyboardShortcuts({
    "/": () => {
      if (!FILTERED_TABS.has(activeTab)) setActiveTab("library");
      requestAnimationFrame(() => document.getElementById("game-search")?.focus());
    },
    "?": () => setShowShortcuts(true),
    "[": () => goToTab(tabIds[(tabIds.indexOf(activeTab) - 1 + tabIds.length) % tabIds.length]),
    "]": () => goToTab(tabIds[(tabIds.indexOf(activeTab) + 1) % tabIds.length]),
    g: () => activeTab === "library" && setPresentation("cards"),
    t: () => activeTab === "library" && setPresentation("table"),
    l: () => activeTab === "library" && setPresentation("list"),
    n: () => activeTab === "library" && filters.page < filters.pageCount && changePage(filters.page + 1),
    p: () => activeTab === "library" && filters.page > 1 && changePage(filters.page - 1),
    d: ({ appId }) => (appId == null ? false : setDetailsAppId(appId)),
    ...statusKeys,
  });

  // Count of the secondary filters that hide behind the "Filters" button on phones.
  const secondaryFilterCount =
    Object.keys(filters.activeFilters).length +
    (filters.playedBefore === null ? 0 : 1) +
    (filters.hasNotes === null ? 0 : 1) +
    (filters.genres.length ? 1 : 0) +
    (filters.deckCompatibility.length ? 1 : 0) +
    (filters.multiplayer === null ? 0 : 1) +
    (filters.notInterested === null ? 0 : 1) +
    (filters.sortColumn ? 1 : 0);
  const hasAnythingToClear = filters.isFiltered || secondaryFilterCount > 0 || Boolean(appliedView);
  const genreOptions = useMemo(
    () => [...new Set(library.games.flatMap((game) => game.genres ?? []))].sort((a, b) => a.localeCompare(b)),
    [library.games]
  );
  const newGames = useMemo(() => library.games.filter((game) => newAppIds.has(game.appId)), [library.games, newAppIds]);

  return (
    <GameActionsProvider value={actions}>
      <ProfileSummary
        profile={library.profile}
        onResync={onResync}
        isSyncing={isSyncing}
        actions={
          <DataMenu
            library={library}
            onShowShortcuts={() => setShowShortcuts(true)}
            onApplyImport={(changes) => updateGamesWithUndo(changes, `Imported changes to ${changes.length} games`)}
          />
        }
      />
      {!newBannerDismissed && <NewGamesBanner games={newGames} onOpen={setDetailsAppId} onDismiss={() => setNewBannerDismissed(true)} />}

      <section className="relative z-10">
        <div
          className="-mx-5 mb-5 flex gap-1 overflow-x-auto border-b border-border px-5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Library views"
          onKeyDown={handleTabKeyDown}
        >
          {TABS.map(([tab, label]) => (
            <button
              key={tab}
              id={`view-tab-${tab}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`view-panel-${tab}`}
              tabIndex={activeTab === tab ? 0 : -1}
              onClick={() => setActiveTab(tab)}
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors ${
                activeTab === tab
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "library" && (
          <StatsPanel
            games={filters.scopedGames}
            libraryCount={library.games.length}
            inViewCount={filters.filteredCount}
            selectedStatuses={filters.selectedStatuses}
            onToggleStatus={filters.toggleStatus}
            isScoped={filters.scopeFilterCount > 0}
            className="mb-6"
          />
        )}

        {FILTERED_TABS.has(activeTab) && (
          <div className="mb-5 space-y-3">
            <div className="flex items-center gap-2">
              <SearchField value={filters.searchQuery} onChange={filters.setSearchQuery} />
              <Button
                variant={secondaryFilterCount ? "outline" : "dashed"}
                size="sm"
                className="h-10 shrink-0 rounded-well sm:hidden"
                aria-expanded={showMobileFilters}
                aria-controls="secondary-filters"
                onClick={() => setShowMobileFilters((shown) => !shown)}
                aria-label={`Filters and sort${secondaryFilterCount ? `, ${secondaryFilterCount} active` : ""}`}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                {secondaryFilterCount > 0 && <span className="tabular-nums">{secondaryFilterCount}</span>}
              </Button>
              <SavedViewsMenu
                savedViews={{ ...savedViews, select: (id) => { setActivePresetId(null); return savedViews.select(id); } }}
                activePreset={activePreset}
                isModified={isModified}
                onApplyPreset={applyPreset}
                onClose={clearAll}
                onStartSave={() => setIsSavingView(true)}
                onCopyLink={copyLink}
                className="max-w-[8rem] shrink-0 px-3 sm:max-w-[16rem]"
              />
            </div>

            {isSavingView && (
              <SaveViewForm
                defaultName={activePreset ? `${activePreset.name} (mine)` : ""}
                onSave={async (name) => {
                  const saved = await savedViews.saveAs(name);
                  if (saved) setActivePresetId(null);
                  return saved;
                }}
                onCancel={() => setIsSavingView(false)}
              />
            )}

            {activeTab !== "play-next" && (
              <StatusFilter
                selectedStatuses={filters.selectedStatuses}
                excludedStatuses={filters.excludedStatuses}
                counts={filters.statusCounts}
                onCycle={filters.cycleStatus}
                onClear={filters.clearStatuses}
              />
            )}

            <div
              id="secondary-filters"
              className={cn("flex-wrap items-center justify-between gap-2 sm:flex", showMobileFilters ? "flex" : "hidden")}
            >
              <FilterBar
                activeFilters={filters.activeFilters}
                onFilterChange={filters.setFilter}
                playedBefore={filters.playedBefore}
                onPlayedBeforeChange={filters.setPlayedBefore}
                hasNotes={filters.hasNotes}
                onHasNotesChange={filters.setHasNotes}
                genreOptions={genreOptions}
                genres={filters.genres}
                onGenresChange={filters.setGenres}
                deckCompatibility={filters.deckCompatibility}
                onDeckCompatibilityChange={filters.setDeckCompatibility}
                multiplayer={filters.multiplayer}
                onMultiplayerChange={filters.setMultiplayer}
                notInterested={filters.notInterested}
                onNotInterestedChange={filters.setNotInterested}
                sortColumn={filters.sortColumn}
                sortDirection={filters.sortDirection}
                onSortChange={filters.setSort}
                showSort={activeTab === "library"}
              />
              {hasAnythingToClear && (
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Clear all
                </Button>
              )}
            </div>

            {savedViews.error && (
              <p role="alert" className="flex items-start justify-between gap-3 text-sm text-status-abandoned">
                {savedViews.error}
                <button type="button" onClick={savedViews.dismissError} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </p>
            )}
          </div>
        )}

        {activeTab === "library" && (
          <div id="view-panel-library" role="tabpanel" aria-labelledby="view-tab-library">
            <div id="library-results" className="scroll-mt-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {filters.isFiltered
                    ? `${filters.filteredCount.toLocaleString()} of ${library.games.length.toLocaleString()} games`
                    : `${filters.filteredCount.toLocaleString()} games`}
                </p>
                <PresentationToggle value={presentation} onChange={setPresentation} />
              </div>

              {presentation === "table" && (
                <BulkActionsBar
                  count={visibleSelection.length}
                  matchingCount={filters.filteredCount}
                  onSelectAllMatching={() => setSelectedIds(new Set(filters.filteredGames.map((game) => game.appId)))}
                  onClear={() => setSelectedIds(new Set())}
                  onSetStatus={bulkSetStatus}
                  onSetPlayedBefore={bulkSetPlayedBefore}
                  onAddToQueue={bulkAddToQueue}
                />
              )}

              {filters.filteredCount === 0 ? (
                <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-border-strong px-4 py-16 text-center">
                  <p className="text-muted-foreground">No games match these filters.</p>
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    Clear all filters
                  </Button>
                </div>
              ) : presentation === "cards" ? (
                <GameGrid games={filters.pageItems} onUpdateGame={updateGame} />
              ) : presentation === "list" ? (
                <GameList games={filters.pageItems} onUpdateGame={updateGame} />
              ) : (
                <GameTable
                  games={filters.pageItems}
                  sortColumn={filters.sortColumn}
                  sortDirection={filters.sortDirection}
                  onSortChange={filters.setSort}
                  onUpdateGame={updateGame}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
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
        )}
        {activeTab === "play-next" && (
          <div id="view-panel-play-next" role="tabpanel" aria-labelledby="view-tab-play-next">
            <PlayNext games={filters.scopedGames} allGames={library.games} />
          </div>
        )}
        {activeTab === "activity" && (
          <div id="view-panel-activity" role="tabpanel" aria-labelledby="view-tab-activity">
            <ActivityTab games={library.games} />
          </div>
        )}
        {activeTab === "history" && (
          <div id="view-panel-history" role="tabpanel" aria-labelledby="view-tab-history">
            <HistoryTab steamId={library.profile.steamId} games={library.games} />
          </div>
        )}
        {activeTab === "wishlist" && (
          <div id="view-panel-wishlist" role="tabpanel" aria-labelledby="view-tab-wishlist">
            <WishlistTab steamId={library.profile.steamId} games={library.games} />
          </div>
        )}
        {activeTab === "compare" && (
          <div id="view-panel-compare" role="tabpanel" aria-labelledby="view-tab-compare">
            <CompareTab profile={library.profile} games={library.games} />
          </div>
        )}
        {activeTab === "metrics" && (
          <div id="view-panel-metrics" role="tabpanel" aria-labelledby="view-tab-metrics">
            <MetricsDashboard games={library.games} scopedGames={filters.scopedGames} filteredGames={filters.filteredGames} />
          </div>
        )}
      </section>

      <GameDetailsDialog game={detailsGame} onOpenChange={(open) => !open && setDetailsAppId(null)} />
      <KeyboardShortcuts open={showShortcuts} onOpenChange={setShowShortcuts} />
    </GameActionsProvider>
  );
}
