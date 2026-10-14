import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, ExternalLink, ListPlus, ListX, ThumbsUp, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatDate, formatHours, formatRelativeTime } from "@/lib/format";
import { progressPercent, reviewDescription, reviewTone, steamLinks } from "@/lib/gameMath";
import { addToQueuePatch, moveInQueue, queueOf } from "@/lib/queue";
import { useCachedRequest } from "@/lib/remoteCache";
import { useGameStatusChange } from "@/hooks/useGameStatusChange";
import { cn } from "@/lib/utils";
import { GameCover } from "./GameCover";
import { FinishedHoursInput } from "./FinishedHoursInput";
import { PlayedBeforeToggle } from "./PlayedBeforeToggle";
import { ProgressBar } from "./ProgressBar";
import { StatusPicker } from "./StatusPicker";
import { useGameActions } from "./GameActions";

const NOTES_MAX = 2000;

const DECK_STYLES = {
  Verified: "border-status-completed/50 text-status-completed",
  Playable: "border-status-problem/50 text-status-problem",
  Unsupported: "border-status-abandoned/50 text-status-abandoned",
  Unknown: "border-border-strong text-muted-foreground",
};

function Section({ title, children, className }) {
  return (
    <section className={cn("space-y-2.5", className)}>
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Fact({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm tabular-nums">{children}</dd>
    </div>
  );
}

function NotesEditor({ game, onUpdateGame }) {
  const stored = game.notes ?? "";
  const [value, setValue] = useState(stored);
  useEffect(() => setValue(stored), [stored]);

  const save = () => {
    const next = value.trim();
    if (next !== stored.trim()) onUpdateGame(game.appId, { notes: next });
  };

  return (
    <div>
      <label htmlFor={`notes-${game.appId}`} className="sr-only">Notes for {game.name}</label>
      <textarea
        id={`notes-${game.appId}`}
        value={value}
        maxLength={NOTES_MAX}
        rows={3}
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        placeholder="Why you bought it, where you left off, who recommended it…"
        className="w-full resize-y rounded-well border border-border-strong bg-abyss px-3 py-2 text-base placeholder:text-muted-foreground/60 sm:text-sm"
      />
      <p className="mt-1 text-right text-[11px] text-muted-foreground">
        {value.length > NOTES_MAX * 0.8 && `${value.length}/${NOTES_MAX} · `}Saves when you click away
      </p>
    </div>
  );
}

function QueueControls({ game, games, onUpdateGames }) {
  const queue = queueOf(games);
  const index = queue.findIndex((item) => item.appId === game.appId);

  if (index === -1) {
    return (
      <Button variant="outline" size="sm" onClick={() => onUpdateGames([{ appId: game.appId, patch: addToQueuePatch(games) }])}>
        <ListPlus className="h-3.5 w-3.5" aria-hidden="true" />
        Add to Up Next
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm">
        #{index + 1} <span className="text-muted-foreground">of {queue.length} in Up Next</span>
      </span>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" aria-label="Move earlier in queue" disabled={index === 0} onClick={() => onUpdateGames(moveInQueue(queue, index, index - 1))}>
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Move later in queue" disabled={index === queue.length - 1} onClick={() => onUpdateGames(moveInQueue(queue, index, index + 1))}>
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onUpdateGames([{ appId: game.appId, patch: { priority: 0 } }])}>
          <ListX className="h-3.5 w-3.5" aria-hidden="true" />
          Remove
        </Button>
      </div>
    </div>
  );
}

function StoreDetails({ appId }) {
  const { data, error, isLoading } = useCachedRequest(`details:${appId}`, () => api.getAppDetails(appId));

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading store details…</p>;
  if (error || !data) return <p className="text-sm text-muted-foreground">Store details aren't available right now.</p>;

  const modes = [data.isSingleplayer && "Single-player", data.isMultiplayer && "Multiplayer"].filter(Boolean);
  return (
    <div className="space-y-3">
      {data.shortDescription && <p className="text-sm leading-relaxed text-muted-foreground">{data.shortDescription}</p>}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Fact label="Released">{data.releaseDate ?? "—"}</Fact>
        <Fact label="Developer">{data.developers?.join(", ") || "—"}</Fact>
        <Fact label="Metacritic">
          {data.metacriticScore == null ? "—" : data.metacriticUrl
            ? <a className="hover:underline" href={data.metacriticUrl} target="_blank" rel="noreferrer">{data.metacriticScore}</a>
            : data.metacriticScore}
        </Fact>
        <Fact label="Modes">{modes.join(", ") || "—"}</Fact>
        <Fact label="Steam Deck">
          <span className={cn("inline-block rounded-full border px-2 py-0.5 text-xs", DECK_STYLES[data.deckCompatibility] ?? DECK_STYLES.Unknown)}>
            {data.deckCompatibility ?? "Unknown"}
          </span>
        </Fact>
      </dl>
      {data.genres?.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Genres">
          {data.genres.map((genre) => (
            <li key={genre} className="rounded-full border border-border-strong px-2.5 py-0.5 text-xs text-muted-foreground">{genre}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Achievements({ steamId, appId }) {
  const { data, isLoading } = useCachedRequest(steamId ? `achievements:${steamId}:${appId}` : null, () => api.getAchievements(steamId, appId));

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading achievements…</p>;
  if (!data?.available) return <p className="text-sm text-muted-foreground">{data?.reason ?? "Achievements couldn't be loaded."}</p>;
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-2 text-sm tabular-nums">
        <Trophy className="h-4 w-4 text-status-problem" aria-hidden="true" />
        {data.unlocked} of {data.total} unlocked
        <span className="text-muted-foreground">({Math.round(data.percent ?? 0)}%)</span>
      </p>
      <ProgressBar percent={data.percent} barClassName="bg-status-problem" label="Achievements unlocked" />
    </div>
  );
}

function DetailsBody({ game }) {
  const { steamId, games, updateGame, updateGames } = useGameActions();
  const [container, setContainer] = useState(null);
  const { handleStatusChange, statusChangePrompt } = useGameStatusChange(game, updateGame, { container });
  const progress = progressPercent(game);
  const description = reviewDescription(game);
  const estimates = [
    ["Main story", game.timeToBeatMainMinutes],
    ["Main + extras", game.timeToBeatMainExtrasMinutes],
    ["Completionist", game.timeToBeatCompletionistMinutes],
  ];

  return (
    <div ref={setContainer} className="min-h-0 overflow-y-auto overscroll-contain">
      <GameCover appId={game.appId} name={game.name} src={game.headerImageUrl} className="rounded-t-card border-b-0" />
      <div className="space-y-6 p-4 sm:p-6">
        <header className="space-y-3">
          <div>
            <DialogTitle className="font-display text-2xl font-light tracking-tight">{game.name}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              {formatHours(game.playtimeForeverMinutes)} played
              {game.lastPlayedUtc ? ` · last played ${formatRelativeTime(game.lastPlayedUtc)}` : ""}
            </DialogDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {steamLinks(game).map((link) => (
              <Button key={link.label} variant="outline" size="sm" asChild>
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </Button>
            ))}
          </div>
        </header>

        <Section title="Your tracking">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                Status{game.statusChangedUtc ? ` · since ${formatDate(game.statusChangedUtc)}` : ""}
              </span>
              <StatusPicker variant="boxed" status={game.status} onChange={handleStatusChange} gameName={game.name} />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Played before</span>
              <PlayedBeforeToggle
                playedBefore={game.playedBefore}
                onChange={(playedBefore) => updateGame(game.appId, { playedBefore })}
                ariaLabel={`Played before on another platform for ${game.name}`}
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Finished hours</span>
              <FinishedHoursInput game={game} onUpdateGame={updateGame} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <QueueControls game={game} games={games} onUpdateGames={updateGames} />
            <Button
              variant={game.notInterested ? "outline" : "ghost"}
              size="sm"
              aria-pressed={Boolean(game.notInterested)}
              onClick={() => updateGame(game.appId, { notInterested: !game.notInterested })}
              title="Hides it from Play Next suggestions"
            >
              {game.notInterested ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
              {game.notInterested ? "Hidden from Play Next" : "Not interested"}
            </Button>
          </div>
          <NotesEditor game={game} onUpdateGame={updateGame} />
          {statusChangePrompt}
        </Section>

        <Section title="Playtime">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact label="Total">{formatHours(game.playtimeForeverMinutes)}</Fact>
            <Fact label="Last 2 weeks">{game.playtimeTwoWeeksMinutes ? formatHours(game.playtimeTwoWeeksMinutes) : "—"}</Fact>
            {estimates.map(([label, minutes]) => (
              <Fact key={label} label={`HLTB ${label.toLowerCase()}`}>{minutes == null ? "—" : formatHours(minutes)}</Fact>
            ))}
          </dl>
          {progress != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Through the main story (by Steam hours)</span>
                <span className="tabular-nums text-foreground">{Math.round(progress)}%{progress > 100 ? " — past the estimate" : ""}</span>
              </div>
              <ProgressBar percent={progress} label="Progress through HLTB main story" />
            </div>
          )}
        </Section>

        <Section title="Steam reviews">
          {game.reviewScore == null ? (
            <p className="text-sm text-muted-foreground">No review data yet.</p>
          ) : (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className={cn("font-medium", reviewTone(description))}>{description}</span>
              <span className="flex items-center gap-1 tabular-nums text-muted-foreground">
                <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                {game.reviewScore.toFixed(1)}% SteamDB rating
              </span>
              {game.reviewCount != null && <span className="text-muted-foreground">{game.reviewCount.toLocaleString()} reviews</span>}
            </p>
          )}
        </Section>

        <Section title="Achievements">
          <Achievements steamId={steamId} appId={game.appId} />
        </Section>

        <Section title="Store details">
          <StoreDetails appId={game.appId} />
        </Section>
      </div>
    </div>
  );
}

export function GameDetailsDialog({ game, onOpenChange }) {
  return (
    <Dialog open={Boolean(game)} onOpenChange={onOpenChange}>
      <DialogContent
        // Escape should close the completion prompt first, not the whole panel.
        onEscapeKeyDown={(event) => {
          if (document.querySelector('[role="alertdialog"]')) event.preventDefault();
        }}
      >
        {game && <DetailsBody key={game.appId} game={game} />}
      </DialogContent>
    </Dialog>
  );
}
