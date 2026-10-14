import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, Clock, EyeOff, ListPlus, Shuffle, SlidersHorizontal, ThumbsUp, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatHours } from "@/lib/format";
import { addToQueuePatch, moveInQueue, queueOf } from "@/lib/queue";
import { cn } from "@/lib/utils";
import { useGameActions } from "./GameActions";
import { GameCover } from "./GameCover";

const LENGTHS = [
  { id: "any", label: "Any length", test: () => true },
  { id: "short", label: "Short", hint: "under 10 h", test: (h) => h != null && h < 10 },
  { id: "medium", label: "Medium", hint: "10–30 h", test: (h) => h != null && h >= 10 && h <= 30 },
  { id: "long", label: "Long", hint: "30 h+", test: (h) => h != null && h > 30 },
];

const WEIGHTS_KEY = "sift:playNextWeights";
const DEFAULT_WEIGHTS = { quality: 60, shortness: 25, confidence: 15 };
const WEIGHT_LABELS = {
  quality: ["Review score", "How well rated it is"],
  shortness: ["Shortness", "Prefer games you can finish sooner"],
  confidence: ["Popularity", "Prefer scores backed by lots of reviews"],
};

function readWeights() {
  try {
    return { ...DEFAULT_WEIGHTS, ...JSON.parse(localStorage.getItem(WEIGHTS_KEY) ?? "{}") };
  } catch {
    return DEFAULT_WEIGHTS;
  }
}

const clamp01 = (value) => Math.max(0, Math.min(1, value));

/** 0–1 ranking score; games with no length estimate get a neutral shortness. */
function rankScore(game, weights) {
  const quality = clamp01((game.reviewScore - 50) / 50);
  const hours = game.timeToBeatMainMinutes == null ? null : game.timeToBeatMainMinutes / 60;
  const shortness = hours == null ? 0.5 : clamp01(1 - Math.log10(Math.max(hours, 1)) / 2); // 1 h → 1, 100 h → 0
  const confidence = clamp01(Math.log10((game.reviewCount ?? 0) + 1) / 5.5); // ~300k reviews → 1
  const total = weights.quality + weights.shortness + weights.confidence || 1;
  return (quality * weights.quality + shortness * weights.shortness + confidence * weights.confidence) / total;
}

function QueueList({ queue, onUpdateGames, onOpen }) {
  if (!queue.length) {
    return (
      <p className="rounded-card border border-dashed border-border-strong p-4 text-sm text-muted-foreground">
        Nothing queued yet. Use <ListPlus className="inline h-3.5 w-3.5" aria-label="Add to Up Next" /> on a game below, or from any game's details, to line up what you'll play next.
      </p>
    );
  }
  return (
    <ol className="divide-y divide-border rounded-card border border-border bg-card">
      {queue.map((game, index) => (
        <li key={game.appId} className="flex items-center gap-3 px-3 py-2 sm:px-4">
          <span className="w-5 shrink-0 text-sm font-medium tabular-nums text-status-playing">{index + 1}</span>
          <button type="button" onClick={() => onOpen(game.appId)} className="min-w-0 flex-1 truncate text-left text-sm hover:underline">
            {game.name}
          </button>
          <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:inline">
            {game.timeToBeatMainMinutes == null ? "" : formatHours(game.timeToBeatMainMinutes)}
          </span>
          <div className="flex shrink-0">
            <Button variant="ghost" size="icon" aria-label={`Move ${game.name} earlier`} disabled={index === 0} onClick={() => onUpdateGames(moveInQueue(queue, index, index - 1))}>
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Move ${game.name} later`} disabled={index === queue.length - 1} onClick={() => onUpdateGames(moveInQueue(queue, index, index + 1))}>
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Remove ${game.name} from Up Next`} onClick={() => onUpdateGames([{ appId: game.appId, patch: { priority: 0 } }])}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </li>
      ))}
    </ol>
  );
}

function WeightsPanel({ weights, onChange }) {
  return (
    <div className="grid gap-4 rounded-card border border-border bg-card p-4 sm:grid-cols-3">
      {Object.entries(WEIGHT_LABELS).map(([key, [label, hint]]) => (
        <label key={key} className="block space-y-1.5">
          <span className="flex justify-between text-sm">
            {label}
            <span className="tabular-nums text-muted-foreground">{weights[key]}</span>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={weights[key]}
            onChange={(event) => onChange({ ...weights, [key]: Number(event.target.value) })}
            className="w-full accent-[hsl(var(--status-playing))]"
          />
          <span className="block text-xs text-muted-foreground">{hint}</span>
        </label>
      ))}
      <Button variant="ghost" size="sm" className="justify-self-start sm:col-span-3" onClick={() => onChange(DEFAULT_WEIGHTS)}>
        Reset to defaults
      </Button>
    </div>
  );
}

/** Unplayed, rated backlog games ranked by adjustable weights. Uses the filter scope, not the status filter. */
export function PlayNext({ games, allGames }) {
  const { openDetails, updateGames } = useGameActions();
  const [length, setLength] = useState("any");
  const [weights, setWeightsState] = useState(readWeights);
  const [showWeights, setShowWeights] = useState(false);
  const [pickedId, setPickedId] = useState(null);
  const [showHidden, setShowHidden] = useState(false);

  const setWeights = (next) => {
    setWeightsState(next);
    try {
      localStorage.setItem(WEIGHTS_KEY, JSON.stringify(next));
    } catch {
      /* not essential */
    }
  };

  const queue = useMemo(() => queueOf(allGames), [allGames]);
  const lengthTest = LENGTHS.find((option) => option.id === length).test;

  const ranked = useMemo(
    () =>
      games
        .filter((game) => game.status === "Backlog" && game.playtimeForeverMinutes === 0 && game.reviewScore != null && !(game.priority > 0) && !game.notInterested)
        .filter((game) => lengthTest(game.timeToBeatMainMinutes == null ? null : game.timeToBeatMainMinutes / 60))
        .map((game) => ({ game, score: rankScore(game, weights) }))
        .sort((a, b) => b.score - a.score || a.game.name.localeCompare(b.game.name)),
    [games, weights, lengthTest]
  );

  const hidden = useMemo(
    () => allGames.filter((game) => game.notInterested).sort((a, b) => a.name.localeCompare(b.name)),
    [allGames]
  );
  const setNotInterested = (appId, value) => updateGames([{ appId, patch: { notInterested: value } }]);

  // Random pick, weighted towards the top of the list.
  const pickForMe = () => {
    const pool = ranked.slice(0, Math.max(10, Math.ceil(ranked.length / 3)));
    const pick = pool[Math.floor(Math.random() ** 1.5 * pool.length)].game;
    setPickedId(pick.appId);
    openDetails(pick.appId);
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Up Next</h2>
          <p className="text-sm text-muted-foreground">Your own running order. Shown as a badge on cards and saved with your library.</p>
        </div>
        <QueueList queue={queue} onUpdateGames={updateGames} onOpen={openDetails} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Suggestions</h2>
            <p className="text-sm text-muted-foreground">Unplayed backlog games with a review score. Search and range filters apply.</p>
          </div>
          <div className="flex gap-2">
            <Button variant={showWeights ? "outline" : "dashed"} size="sm" onClick={() => setShowWeights((shown) => !shown)} aria-expanded={showWeights}>
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              Tune ranking
            </Button>
            {ranked.length > 1 && (
              <Button variant="outline" size="sm" onClick={pickForMe}>
                <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                Pick for me
              </Button>
            )}
          </div>
        </div>

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0" role="group" aria-label="Game length">
          {LENGTHS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={length === option.id}
              onClick={() => setLength(option.id)}
              className={cn(
                "flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] transition-colors sm:h-8",
                length === option.id ? "border-foreground/70 bg-foreground/[0.06] text-foreground" : "border-border-strong text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
              {option.hint && <span className="text-muted-foreground">{option.hint}</span>}
            </button>
          ))}
        </div>

        {showWeights && <WeightsPanel weights={weights} onChange={setWeights} />}

        {ranked.length ? (
          <ol className="divide-y divide-border rounded-card border border-border bg-card">
            {ranked.map(({ game, score }, index) => (
              <li key={game.appId} className={cn("flex items-center gap-3 px-3 py-2 sm:px-4", pickedId === game.appId && "bg-status-playing/[0.08]")}>
                <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                <button type="button" onClick={() => openDetails(game.appId)} className="hidden w-20 shrink-0 overflow-hidden rounded-md sm:block" tabIndex={-1} aria-hidden="true">
                  <GameCover appId={game.appId} name={game.name} src={game.headerImageUrl} className="rounded-none border-0" />
                </button>
                <button type="button" onClick={() => openDetails(game.appId)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm hover:underline">{game.name}</span>
                  <span className="mt-0.5 flex gap-3 text-xs tabular-nums text-muted-foreground">
                    <span className="flex items-center gap-1" title="Steam review score">
                      <ThumbsUp className="h-3 w-3" aria-hidden="true" />
                      {Math.round(game.reviewScore)}%
                    </span>
                    <span className="flex items-center gap-1" title="HLTB main-story estimate">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {game.timeToBeatMainMinutes == null ? "—" : formatHours(game.timeToBeatMainMinutes)}
                    </span>
                    <span className="hidden sm:inline" title="Ranking score">Match {Math.round(score * 100)}</span>
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label={`Not interested in ${game.name}`}
                  title="Not interested: hide from suggestions"
                  onClick={() => setNotInterested(game.appId, true)}
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="-ml-2 shrink-0"
                  aria-label={`Add ${game.name} to Up Next`}
                  title="Add to Up Next"
                  onClick={() => updateGames([{ appId: game.appId, patch: addToQueuePatch(allGames) }])}
                >
                  <ListPlus className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="flex items-center gap-2 rounded-card border border-border bg-card p-4 text-sm text-muted-foreground">
            <Check className="h-4 w-4" aria-hidden="true" />
            No unplayed, rated backlog games match{length === "any" ? " the current filters" : " this length and the current filters"}.
          </p>
        )}

        {hidden.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowHidden((shown) => !shown)}
              aria-expanded={showHidden}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", showHidden && "rotate-180")} aria-hidden="true" />
              {hidden.length} marked not interested
            </button>
            {showHidden && (
              <ul className="mt-2 divide-y divide-border rounded-card border border-border bg-card">
                {hidden.map((game) => (
                  <li key={game.appId} className="flex items-center justify-between gap-3 px-3 py-1.5 sm:px-4">
                    <button type="button" onClick={() => openDetails(game.appId)} className="min-w-0 truncate text-left text-sm text-muted-foreground hover:text-foreground hover:underline">
                      {game.name}
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => setNotInterested(game.appId, false)}>
                      <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Restore
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
