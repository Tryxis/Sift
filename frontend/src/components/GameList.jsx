import { Clock, ThumbsUp } from "lucide-react";
import { GameCover } from "./GameCover";
import { ProgressBar } from "./ProgressBar";
import { StatusPicker } from "./StatusPicker";
import { useGameActions } from "./GameActions";
import { formatHours, formatRelativeTime } from "@/lib/format";
import { progressPercent } from "@/lib/gameMath";
import { getStatusMeta } from "@/lib/status";
import { useGameStatusChange } from "@/hooks/useGameStatusChange";

function GameListRow({ game, onUpdateGame, isNew, queuePosition }) {
  const { openDetails } = useGameActions();
  const { handleStatusChange, statusChangePrompt } = useGameStatusChange(game, onUpdateGame);
  const status = getStatusMeta(game.status);
  const progress = progressPercent(game);

  return (
    <li className="flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4" data-app-id={game.appId}>
      <button
        type="button"
        onClick={() => openDetails(game.appId)}
        className="w-20 shrink-0 overflow-hidden rounded-md sm:w-28"
        aria-label={`All details for ${game.name}`}
        tabIndex={-1}
      >
        <GameCover appId={game.appId} name={game.name} src={game.headerImageUrl} className="rounded-none border-0" />
      </button>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => openDetails(game.appId)}
          className="flex max-w-full items-center gap-2 text-left text-sm font-medium hover:underline"
        >
          <span className="truncate">{game.name}</span>
          {isNew && <span className="shrink-0 rounded-full bg-status-playing px-1.5 text-[10px] font-semibold uppercase text-primary-foreground">New</span>}
          {queuePosition && <span className="shrink-0 text-[11px] font-normal text-muted-foreground">#{queuePosition} up next</span>}
        </button>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 tabular-nums">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {formatHours(game.playtimeForeverMinutes)}
            {game.timeToBeatMainMinutes != null && <span className="hidden sm:inline">/ {formatHours(game.timeToBeatMainMinutes)} HLTB</span>}
          </span>
          {game.reviewScore != null && (
            <span className="flex items-center gap-1 tabular-nums">
              <ThumbsUp className="h-3 w-3" aria-hidden="true" />
              {Math.round(game.reviewScore)}%
            </span>
          )}
          {game.lastPlayedUtc && <span className="hidden min-[420px]:inline">{formatRelativeTime(game.lastPlayedUtc)}</span>}
        </div>
        {progress != null && <ProgressBar percent={progress} className="mt-1.5 h-1 max-w-48" label={`${Math.round(progress)}% through the main story`} />}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className={`hidden text-xs sm:inline ${status.textClass}`}>{status.label}</span>
        <StatusPicker status={game.status} onChange={handleStatusChange} gameName={game.name} />
      </div>
      {statusChangePrompt}
    </li>
  );
}

export function GameList({ games, onUpdateGame }) {
  const { newAppIds, queuePositions } = useGameActions();
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
      {games.map((game) => (
        <GameListRow
          key={game.appId}
          game={game}
          onUpdateGame={onUpdateGame}
          isNew={newAppIds.has(game.appId)}
          queuePosition={queuePositions.get(game.appId) ?? null}
        />
      ))}
    </ul>
  );
}
