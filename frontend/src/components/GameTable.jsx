import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { StatusPicker } from "./StatusPicker";
import { getStatusMeta } from "@/lib/status";
import { formatHours } from "@/lib/format";
import { useGameStatusChange } from "@/hooks/useGameStatusChange";
import { PlayedBeforeToggle } from "./PlayedBeforeToggle";

const COLUMNS = [
  { id: "name", label: "Game", align: "left" },
  { id: "status", label: "Status", align: "left" },
  { id: "hours", label: "Steam hours", align: "right" },
  { id: "reviewScore", label: "Review score", align: "right" },
  { id: "timeToBeat", label: "HLTB main", align: "right" },
  { id: "finishedHours", label: "Finished hours", align: "right" },
  { id: "playedBefore", label: "Played before", align: "center" },
];

function SortButton({ column, direction, onToggle }) {
  const Icon = direction === "ascending" ? ArrowUp : direction === "descending" ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-muted-foreground transition-colors hover:text-foreground"
      aria-label={`Sort by ${column.label}${direction ? `, ${direction}` : ""}`}
      onClick={onToggle}
    >
      {column.label}
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

function FinishedHoursCell({ game, onUpdateGame }) {
  const [value, setValue] = useState(game.finishedHours?.toString() ?? "");
  useEffect(() => setValue(game.finishedHours?.toString() ?? ""), [game.finishedHours]);

  const save = () => {
    const trimmed = value.trim();
    if (!trimmed) {
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
    <input
      aria-label={`Finished hours for ${game.name}`}
      type="number"
      inputMode="decimal"
      min="0"
      max="1000000"
      step="0.1"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={save}
      placeholder="—"
      className="h-8 w-24 rounded-well border border-border-strong bg-abyss px-2 text-right tabular-nums placeholder:text-muted-foreground/60 focus-visible:ring-1"
    />
  );
}

function GameTableRow({ game, onUpdateGame }) {
  const status = getStatusMeta(game.status, game.playedBefore);
  const { handleStatusChange, statusChangePrompt } = useGameStatusChange(game, onUpdateGame);

  return (
    <>
      <tr className="group transition-colors hover:bg-muted/30">
        <th scope="row" className="sticky left-0 z-10 max-w-72 bg-card px-4 py-3 text-left font-medium group-hover:bg-muted/30">
          <span className="block truncate" title={game.name}>{game.name}</span>
        </th>
        <td className="whitespace-nowrap px-4 py-3">
          <span className="inline-flex items-center gap-1.5">
            <StatusPicker
              status={game.status}
              playedBefore={game.playedBefore}
              onChange={handleStatusChange}
            />
            <span className={`text-xs ${status.textClass}`}>{status.label}</span>
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatHours(game.playtimeForeverMinutes)}</td>
        <td className="px-4 py-3 text-right tabular-nums">{game.reviewScore == null ? "—" : `${game.reviewScore.toFixed(1)}%`}</td>
        <td className="px-4 py-3 text-right tabular-nums">{game.timeToBeatMainMinutes == null ? "—" : formatHours(game.timeToBeatMainMinutes)}</td>
        <td className="px-4 py-3 text-right"><div className="flex justify-end"><FinishedHoursCell game={game} onUpdateGame={onUpdateGame} /></div></td>
        <td className="px-4 py-3 text-center">
          <div className="mx-auto w-16">
            <PlayedBeforeToggle
              playedBefore={game.playedBefore}
              onChange={(playedBefore) => onUpdateGame(game.appId, { playedBefore })}
              ariaLabel={`Played before on another platform for ${game.name}`}
            />
          </div>
        </td>
      </tr>
      {statusChangePrompt}
    </>
  );
}

export function GameTable({
  games,
  sortColumn,
  sortDirection,
  onSortChange,
  onUpdateGame,
}) {
  const toggleSort = (column) => {
    if (sortColumn !== column) {
      onSortChange(column, "ascending");
    } else if (sortDirection === "ascending") {
      onSortChange(column, "descending");
    } else {
      onSortChange(null, null);
    }
  };

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-card">
      <table className="w-full min-w-[850px] border-collapse text-left text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {COLUMNS.map((column) => (
              <th
                key={column.id}
                scope="col"
                aria-sort={sortColumn === column.id ? sortDirection : "none"}
                className={`whitespace-nowrap px-4 py-3 ${column.id === "name" ? "sticky left-0 z-20 bg-muted/50" : ""} ${column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"}`}
              >
                <div className={`flex flex-col gap-2 ${column.align === "right" ? "items-end" : column.align === "center" ? "items-center" : "items-start"}`}>
                  <SortButton
                    column={column}
                    direction={sortColumn === column.id ? sortDirection : null}
                    onToggle={() => toggleSort(column.id)}
                  />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {games.map((game) => <GameTableRow key={game.appId} game={game} onUpdateGame={onUpdateGame} />)}
          {games.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-muted-foreground">No games match these filters.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
