import { useEffect, useState } from "react";
import { Check, ChevronDown, Clock, RotateCcw, ThumbsUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GameCover } from "./GameCover";
import { StatusPicker } from "./StatusPicker";
import { formatHours } from "@/lib/format";
import { STATUSES, STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";

function ReviewScore({ game }) {
  if (game.reviewScore == null) return null;

  const title = `Review score ${game.reviewScore.toFixed(1)}% from ${game.reviewCount?.toLocaleString()} Steam reviews`;
  return (
    <span
      className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground sm:text-[13px]"
      title={title}
      aria-label={title}
    >
      <ThumbsUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {Math.round(game.reviewScore)}%
    </span>
  );
}

function FinishedHoursEditor({ game, onUpdateGame }) {
  const [value, setValue] = useState(game.finishedHours?.toString() ?? "");

  useEffect(() => {
    setValue(game.finishedHours?.toString() ?? "");
  }, [game.finishedHours]);

  const save = () => {
    const trimmed = value.trim();
    if (trimmed === "") {
      if (game.finishedHours != null) onUpdateGame(game.appId, { clearFinishedHours: true });
      return;
    }

    const hours = Number(trimmed);
    if (!Number.isFinite(hours) || hours < 0 || hours > 1_000_000) {
      setValue(game.finishedHours?.toString() ?? "");
      return;
    }

    if (hours !== game.finishedHours) onUpdateGame(game.appId, { finishedHours: hours });
  };

  return (
    <label className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-3 text-sm">
      <span className="text-xs text-muted-foreground">Finished hours</span>
      <span className="relative">
        <input
          aria-label={`Finished hours for ${game.name}`}
          className="h-8 w-full rounded-well border border-border-strong bg-abyss px-2 pr-8 text-right text-sm tabular-nums text-foreground"
          type="number"
          min="0"
          max="1000000"
          step="0.1"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={save}
          placeholder="—"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">hrs</span>
      </span>
    </label>
  );
}

function PlayedBeforeField({ game, onUpdateGame }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-3 text-xs">
      <span className="text-muted-foreground">Played before</span>
      <div
        className="ml-auto grid h-8 w-[4.5rem] grid-cols-2 overflow-hidden rounded-md border border-border-strong bg-abyss p-0.5"
        role="group"
        aria-label={`Played before on another platform for ${game.name}`}
      >
        {[true, false].map((playedBefore) => {
          const label = playedBefore ? "Y" : "N";
          const selected = game.playedBefore === playedBefore;
          return (
            <button
              key={label}
              type="button"
              aria-label={`${playedBefore ? "Yes" : "No"}, played before`}
              aria-pressed={selected}
              className={`rounded-sm font-medium transition-colors ${
                selected
                  ? "bg-status-playing/20 text-status-playing"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              onClick={() => {
                if (!selected) onUpdateGame(game.appId, { playedBefore });
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimeToBeat({ game }) {
  const times = [
    ["Main", game.timeToBeatMainMinutes],
    ["Extras", game.timeToBeatMainExtrasMinutes],
    ["100%", game.timeToBeatCompletionistMinutes],
  ].filter(([, minutes]) => minutes != null);

  return (
    <section className="space-y-1" aria-label="HowLongToBeat estimates">
      <h4 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">HowLongToBeat</h4>
      {times.length ? (
        <dl className="grid grid-cols-3 gap-1 text-[11px]">
          {times.map(([label, minutes]) => (
            <div key={label} className="flex min-w-0 flex-col">
              <dt className="truncate text-muted-foreground">{label}</dt>
              <dd className="truncate tabular-nums">{formatHours(minutes)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-[11px] text-muted-foreground">No estimate yet.</p>
      )}
    </section>
  );
}

function StatusField({ game, onUpdateGame }) {
  return (
    <div>
      <div aria-hidden="true" className="my-2.5 border-t border-border" />
      <div className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-3 text-xs">
        <span className="text-muted-foreground">Status</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Status for ${game.name}: ${game.status}`}
              className="flex h-8 w-full items-center gap-2 rounded-well border border-border-strong bg-abyss px-2 text-left text-foreground"
            >
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", STATUS_META[game.status].dotClass)} />
              <span className="min-w-0 flex-1 truncate">{STATUS_META[game.status].label}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-36">
            <DropdownMenuLabel>Set status</DropdownMenuLabel>
            {STATUSES.map((status) => (
              <DropdownMenuItem key={status} onSelect={() => status !== game.status && onUpdateGame(game.appId, { status })}>
                <span className={cn("h-2.5 w-2.5 rounded-full", STATUS_META[status].dotClass)} />
                <span className="flex-1">{STATUS_META[status].label}</span>
                {status === game.status && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function GameCard({ game, onUpdateGame }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const handleCardClick = (event) => {
    if (event.target.closest("button, input, select, a, [role='menuitem']")) return;
    setIsFlipped((flipped) => !flipped);
  };

  return (
    <div
      className="cursor-pointer rounded-card transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_0_24px_hsl(var(--status-playing)/0.18)] [perspective:1000px]"
      role="group"
      aria-label={`${game.name}. Click the card to view details.`}
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          setIsFlipped((flipped) => !flipped);
        }
      }}
    >
      <div
        className={`relative [transform-style:preserve-3d] transition-transform duration-700 ease-out ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <Card className="flex min-h-[270px] flex-col [backface-visibility:hidden] sm:min-h-[290px]">
          <GameCover
            appId={game.appId}
            name={game.name}
            src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/library_600x900.jpg`}
            fallbackSrc={game.headerImageUrl}
            shape="portrait"
          />
          <div className="flex flex-col gap-2 px-3 pb-2 pt-3 sm:gap-3 sm:px-4 sm:pb-3 sm:pt-3.5">
            <h3 className="line-clamp-1 text-sm font-medium sm:text-[15px]" title={game.name}>
              {game.name}
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground sm:text-[13px]"
                  title={`${formatHours(game.playtimeForeverMinutes)} played`}
                >
                  <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {formatHours(game.playtimeForeverMinutes)}
                </span>
                <ReviewScore game={game} />
              </div>
              <StatusPicker status={game.status} onChange={(status) => onUpdateGame(game.appId, { status })} />
            </div>
          </div>
        </Card>

        <Card className="absolute inset-0 flex min-h-[270px] flex-col [backface-visibility:hidden] [transform:rotateY(180deg)] sm:min-h-[290px]">
          <GameCover appId={game.appId} name={game.name} src={game.headerImageUrl} />
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-3 py-2 sm:px-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="line-clamp-1 text-xs font-medium sm:text-sm" title={game.name}>
                {game.name}
              </h3>
              <button
                type="button"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setIsFlipped(false)}
                aria-label={`Show cover for ${game.name}`}
                title="Show cover"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <TimeToBeat game={game} />
            <StatusField game={game} onUpdateGame={onUpdateGame} />
            <PlayedBeforeField game={game} onUpdateGame={onUpdateGame} />
            <FinishedHoursEditor game={game} onUpdateGame={onUpdateGame} />
            <div className="mt-auto flex items-center justify-between border-t border-border pt-1">
              <span className="flex items-center gap-3">
                <span
                  className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground"
                  title={`${formatHours(game.playtimeForeverMinutes)} played`}
                >
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatHours(game.playtimeForeverMinutes)}
                </span>
                <ReviewScore game={game} />
              </span>
              <StatusPicker status={game.status} onChange={(status) => onUpdateGame(game.appId, { status })} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
