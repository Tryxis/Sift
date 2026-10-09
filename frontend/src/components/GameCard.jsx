import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, RotateCcw, ThumbsUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { GameCover } from "./GameCover";
import { StatusPicker } from "./StatusPicker";
import { formatHours } from "@/lib/format";
import { getStatusMeta } from "@/lib/status";

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
    <label className="grid min-w-0 grid-cols-[minmax(0,1fr)_4rem] items-center gap-1.5 text-sm sm:grid-cols-[minmax(0,1fr)_9rem] sm:gap-3">
      <span className="text-[9px] leading-tight text-muted-foreground sm:text-xs" title="Finished hours">Finished hours</span>
      <span className="relative min-w-0 w-full">
        <input
          aria-label={`Finished hours for ${game.name}`}
          className="h-8 min-w-0 w-full rounded-well border border-border-strong bg-abyss px-1.5 text-right text-sm tabular-nums text-foreground sm:px-2 sm:pr-8"
          type="number"
          min="0"
          max="1000000"
          step="0.1"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={save}
          placeholder="—"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 text-[10px] text-muted-foreground sm:block">hrs</span>
      </span>
    </label>
  );
}

function PlayedBeforeField({ game, onUpdateGame }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_4rem] items-center gap-1.5 text-xs sm:grid-cols-[minmax(0,1fr)_9rem] sm:gap-3">
      <span className="text-muted-foreground">Played before</span>
      <div
        className="relative ml-auto grid h-8 w-full grid-cols-2 overflow-hidden rounded-well border border-border-strong bg-abyss p-0"
        role="group"
        aria-label={`Played before on another platform for ${game.name}`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-status-playing/30 transition-transform duration-200 ease-out ${
            game.playedBefore ? "" : "translate-x-full"
          }`}
        />
        {[true, false].map((playedBefore) => {
          const label = playedBefore ? "Y" : "N";
          const selected = game.playedBefore === playedBefore;
          return (
            <button
              key={label}
              type="button"
              aria-label={`${playedBefore ? "Yes" : "No"}, played before`}
              aria-pressed={selected}
              className={`relative z-10 grid h-full min-w-0 place-items-center rounded-none font-medium transition-colors ${
                selected
                  ? "text-foreground"
                  : "text-muted-foreground"
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
        <dl className="grid grid-cols-3 gap-1 text-[9px] sm:text-[11px]">
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

function StatusField({ game, onStatusChange }) {
  return (
    <div>
      <div aria-hidden="true" className="my-2.5 border-t border-border" />
      <div className="status-selector-container grid min-w-0 grid-cols-[minmax(0,1fr)_4rem] items-center gap-1.5 text-xs sm:grid-cols-[minmax(0,1fr)_9rem] sm:gap-3">
        <span className="truncate text-muted-foreground">Status</span>
        <StatusPicker
          status={game.status}
          playedBefore={game.playedBefore}
          onChange={onStatusChange}
          boxed
        />
      </div>
    </div>
  );
}

function CompletionPrompt({ game, status, finishedHours, triggerRect, onClose, onConfirm }) {
  const cancelRef = useRef(null);
  const dialogRef = useRef(null);
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const buttons = dialogRef.current?.querySelectorAll("button");
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("resize", updateViewport);
    window.addEventListener("keydown", handleKeyDown);
    cancelRef.current?.focus();
    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const dialogWidth = Math.min(352, viewport.width - 32);
  const left = Math.max(16, Math.min(
    (triggerRect?.left ?? viewport.width / 2) + (triggerRect?.width ?? 0) / 2 - dialogWidth / 2,
    viewport.width - dialogWidth - 16
  ));
  const top = Math.max(24, Math.min(
    (triggerRect?.top ?? viewport.height / 2) - 110,
    viewport.height - 260
  ));
  const replacementNotice = game.finishedHours == null
    ? null
    : `This will replace the current Finished Hours value of ${game.finishedHours} hours.`;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-background/70 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <section
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`completion-title-${game.appId}`}
        aria-describedby={`completion-description-${game.appId}`}
        className="absolute rounded-card border border-border-strong bg-card p-5 shadow-[0_20px_70px_hsl(220_33%_2%/0.8)]"
        style={{ left, top, width: dialogWidth }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4">
          <h2 id={`completion-title-${game.appId}`} className="font-display text-lg font-medium">
            Mark as {status.toLowerCase()}?
          </h2>
          <p id={`completion-description-${game.appId}`} className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Copy {finishedHours} hours of current Steam playtime to Finished Hours for <span className="text-foreground">{game.name}</span>?
          </p>
          {replacementNotice && <p className="mt-2 text-xs text-status-problem">{replacementNotice}</p>}
          <p className="mt-2 text-xs text-muted-foreground">This is a one-time copy. Finished Hours will not track future Steam playtime.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            className="rounded-well border border-border-strong px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-well border border-border-strong px-3 py-2 text-sm transition-colors hover:bg-muted"
            onClick={() => onConfirm(false)}
          >
            Status only
          </button>
          <button
            type="button"
            className="rounded-well bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            onClick={() => onConfirm(true)}
          >
            Copy hours
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}

export function GameCard({ game, onUpdateGame }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [completionPrompt, setCompletionPrompt] = useState(null);
  const closeCompletionPrompt = useCallback(() => setCompletionPrompt(null), []);
  const handleStatusChange = (status, triggerRect) => {
    if (["Completed", "Abandoned"].includes(status) && game.status !== status) {
      const finishedHours = Number((game.playtimeForeverMinutes / 60).toFixed(2));
      setCompletionPrompt({ status, finishedHours, triggerRect });
      return;
    }
    onUpdateGame(game.appId, { status });
  };

  const confirmCompletion = (copyHours) => {
    const patch = { status: completionPrompt.status };
    if (copyHours) patch.finishedHours = completionPrompt.finishedHours;
    setCompletionPrompt(null);
    onUpdateGame(game.appId, patch);
  };

  const handleCardClick = (event) => {
    if (event.target.closest("button, input, select, a, [role='menuitem']")) return;
    setIsFlipped((flipped) => !flipped);
  };

  return (
    <div
      className="min-w-0 cursor-pointer rounded-card transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_0_24px_hsl(var(--status-playing)/0.18)] [perspective:1000px]"
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
        <Card className="flex min-h-[270px] min-w-0 flex-col [backface-visibility:hidden] sm:min-h-[290px]">
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
            <div className="status-selector-container flex min-w-0 items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <span
                  className="flex min-w-0 items-center gap-1 text-[10px] tabular-nums text-muted-foreground sm:gap-1.5 sm:text-[13px]"
                  title={`${formatHours(game.playtimeForeverMinutes)} played`}
                >
                  <Clock className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                  {formatHours(game.playtimeForeverMinutes)}
                </span>
                <ReviewScore game={game} />
              </div>
              <div className="hidden sm:block">
                <StatusPicker
                  status={game.status}
                  playedBefore={game.playedBefore}
                  onChange={handleStatusChange}
                />
              </div>
              <div className="flex h-11 w-11 items-center justify-center sm:hidden" title={game.playedBefore && game.status === "Completed" ? "Completed before" : game.status}>
                <span
                  role="img"
                  aria-label={game.playedBefore && game.status === "Completed" ? "Completed before" : game.status}
                  className={`h-3.5 w-3.5 rounded-full ${getStatusMeta(game.status, game.playedBefore).dotClass}`}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="absolute inset-0 flex min-h-[270px] min-w-0 flex-col [backface-visibility:hidden] [transform:rotateY(180deg)] sm:min-h-[290px]">
          <GameCover appId={game.appId} name={game.name} src={game.headerImageUrl} />
          <div className="flex min-h-0 flex-1 flex-col gap-0.5 px-2 py-1.5 sm:gap-1.5 sm:px-4 sm:py-2">
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
            <StatusField game={game} onStatusChange={handleStatusChange} />
            <PlayedBeforeField game={game} onUpdateGame={onUpdateGame} />
            <FinishedHoursEditor game={game} onUpdateGame={onUpdateGame} />
            <div className="status-selector-container mt-auto hidden items-center justify-between border-t border-border pt-1 sm:flex">
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground"
                  title={`${formatHours(game.playtimeForeverMinutes)} played`}
                >
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatHours(game.playtimeForeverMinutes)}
                </span>
                <ReviewScore game={game} />
              </span>
              <StatusPicker
                status={game.status}
                playedBefore={game.playedBefore}
                onChange={handleStatusChange}
              />
            </div>
            {completionPrompt && (
              <CompletionPrompt
                game={game}
                status={completionPrompt.status}
                finishedHours={completionPrompt.finishedHours}
                triggerRect={completionPrompt.triggerRect}
                onClose={closeCompletionPrompt}
                onConfirm={confirmCompletion}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
