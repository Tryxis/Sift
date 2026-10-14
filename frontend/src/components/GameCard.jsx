import { useState } from "react";
import { Clock, Info, RotateCcw, ThumbsUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { GameCover } from "./GameCover";
import { StatusPicker } from "./StatusPicker";
import { PlayedBeforeToggle } from "./PlayedBeforeToggle";
import { FinishedHoursInput } from "./FinishedHoursInput";
import { ProgressBar } from "./ProgressBar";
import { useGameActions } from "./GameActions";
import { formatDate, formatHours, formatRelativeTime } from "@/lib/format";
import { progressPercent } from "@/lib/gameMath";
import { useGameStatusChange } from "@/hooks/useGameStatusChange";

function Playtime({ game, className = "" }) {
  return (
    <span
      className={`flex shrink-0 items-center gap-1 whitespace-nowrap tabular-nums ${className}`}
      title={`${formatHours(game.playtimeForeverMinutes)} played${game.lastPlayedUtc ? `, last ${formatRelativeTime(game.lastPlayedUtc)}` : ""}`}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {formatHours(game.playtimeForeverMinutes)}
    </span>
  );
}

function ReviewScore({ game, className = "" }) {
  if (game.reviewScore == null) return null;
  const title = `Review score ${game.reviewScore.toFixed(1)}% from ${game.reviewCount?.toLocaleString() ?? "?"} Steam reviews`;
  return (
    <span className={`flex shrink-0 items-center gap-1 whitespace-nowrap tabular-nums ${className}`} title={title} aria-label={title}>
      <ThumbsUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {Math.round(game.reviewScore)}%
    </span>
  );
}

function TimeToBeat({ game }) {
  const progress = progressPercent(game);
  const times = [
    ["Main", game.timeToBeatMainMinutes],
    ["Extras", game.timeToBeatMainExtrasMinutes],
    ["100%", game.timeToBeatCompletionistMinutes],
  ].filter(([, minutes]) => minutes != null);

  return (
    <section aria-label="HowLongToBeat estimates">
      <h4 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">HowLongToBeat</h4>
      {times.length ? (
        <dl className="mt-1 grid grid-cols-[repeat(auto-fit,minmax(2.75rem,1fr))] gap-1 text-[11px] @[14rem]:text-xs">
          {times.map(([label, minutes]) => (
            <div key={label} className="flex min-w-0 flex-col">
              <dt className="truncate text-muted-foreground">{label}</dt>
              <dd className="truncate tabular-nums">{formatHours(minutes)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-1 text-[11px] text-muted-foreground">No estimate yet.</p>
      )}
      {progress != null && (
        <ProgressBar
          percent={progress}
          className="mt-1.5 h-1"
          label={`${Math.round(progress)}% through the main story`}
        />
      )}
    </section>
  );
}

/**
 * Label beside the control once the card has room. On narrow cards, compact controls
 * stay inline and wide ones (status) drop below their label.
 */
function Field({ label, stacked = false, children }) {
  return (
    <div
      className={`grid min-w-0 items-center gap-x-2 gap-y-1 @[14rem]:grid-cols-[minmax(0,1fr)_8.5rem] @[14rem]:gap-x-3 ${
        stacked ? "" : "grid-cols-[minmax(0,1fr)_4rem]"
      }`}
    >
      <span className="text-[11px] leading-tight text-muted-foreground @[14rem]:text-xs">{label}</span>
      {children}
    </div>
  );
}

function CoverBadges({ isNew, queuePosition }) {
  if (!isNew && !queuePosition) return null;
  return (
    <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
      {isNew && (
        <span className="rounded-full bg-status-playing px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">New</span>
      )}
      {queuePosition && (
        <span className="rounded-full border border-white/10 bg-background/80 px-2 py-0.5 text-[10px] font-medium backdrop-blur">
          Up next #{queuePosition}
        </span>
      )}
    </div>
  );
}

export function GameCard({ game, onUpdateGame, isNew = false, queuePosition = null }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const { openDetails } = useGameActions();
  const { handleStatusChange, statusChangePrompt } = useGameStatusChange(game, onUpdateGame);
  const flip = () => setIsFlipped((flipped) => !flipped);

  const handleCardClick = (event) => {
    // Ignore clicks on controls and on anything portalled out of the card (menus, dialogs).
    if (!event.currentTarget.contains(event.target)) return;
    if (event.target.closest("button, input, select, label, a, [role='menuitem']")) return;
    flip();
  };

  return (
    <div
      className="@container min-w-0 cursor-pointer rounded-card transition-[transform,box-shadow] duration-200 [perspective:1000px] hover:-translate-y-1 hover:shadow-[0_0_24px_hsl(var(--status-playing)/0.18)]"
      role="group"
      aria-label={`${game.name}. Press Enter to ${isFlipped ? "show the cover" : "view details"}.`}
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          flip();
        }
      }}
    >
      <div
        className={`relative [transform-style:preserve-3d] transition-transform duration-500 ease-out ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* Front */}
        <Card className="flex min-w-0 flex-col [backface-visibility:hidden]" inert={isFlipped ? "" : undefined}>
          <div className="relative">
            <GameCover
              appId={game.appId}
              name={game.name}
              src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/library_600x900.jpg`}
              fallbackSrc={game.headerImageUrl}
              shape="portrait"
            />
            <CoverBadges isNew={isNew} queuePosition={queuePosition} />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 px-3 pb-3 pt-2.5 @[13rem]:gap-2 @[13rem]:px-4 @[13rem]:pt-3">
            <h3 className="truncate text-sm font-medium @[13rem]:text-[15px]" title={game.name}>
              {game.name}
            </h3>
            <div className="-my-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground @[13rem]:gap-3 @[13rem]:text-[13px]">
              <Playtime game={game} />
              <ReviewScore game={game} />
              <StatusPicker
                variant="inline"
                status={game.status}
                playedBefore={game.playedBefore}
                onChange={handleStatusChange}
                gameName={game.name}
              />
            </div>
          </div>
        </Card>

        {/* Back */}
        <Card
          className="absolute inset-0 flex min-w-0 flex-col overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)]"
          inert={isFlipped ? undefined : ""}
        >
          <GameCover appId={game.appId} name={game.name} src={game.headerImageUrl} className="hidden @[15rem]:block" />
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-2.5 @[13rem]:gap-2.5 @[13rem]:px-4 @[13rem]:py-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-sm font-medium" title={game.name}>
                {game.name}
              </h3>
              <div className="-mr-1.5 -mt-1 flex shrink-0">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => openDetails(game.appId)}
                  aria-label={`All details for ${game.name}`}
                  title="All details"
                >
                  <Info className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setIsFlipped(false)}
                  aria-label={`Show cover for ${game.name}`}
                  title="Show cover"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <TimeToBeat game={game} />
            <div className="border-t border-border" aria-hidden="true" />
            <Field label={game.statusChangedUtc ? `Status · ${formatDate(game.statusChangedUtc, { short: true })}` : "Status"} stacked>
              <StatusPicker
                variant="boxed"
                status={game.status}
                playedBefore={game.playedBefore}
                onChange={handleStatusChange}
                gameName={game.name}
              />
            </Field>
            <Field label="Played before">
              <PlayedBeforeToggle
                playedBefore={game.playedBefore}
                onChange={(playedBefore) => onUpdateGame(game.appId, { playedBefore })}
                ariaLabel={`Played before on another platform for ${game.name}`}
              />
            </Field>
            <Field label="Finished hours">
              <FinishedHoursInput game={game} onUpdateGame={onUpdateGame} showUnit />
            </Field>
            <div className="mt-auto hidden items-center gap-3 border-t border-border pt-2 text-xs text-muted-foreground @[15rem]:flex">
              <Playtime game={game} />
              <ReviewScore game={game} />
              {game.lastPlayedUtc && (
                <span className="ml-auto truncate" title="Last played">{formatRelativeTime(game.lastPlayedUtc)}</span>
              )}
            </div>
          </div>
        </Card>
      </div>
      {statusChangePrompt}
    </div>
  );
}
